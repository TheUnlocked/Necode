import Joi, { Schema } from 'joi';
import { posix as path } from 'path';
import { makePluginEntity } from '~api/entities/PluginEntity';
import { NecodeJson, PackageJson } from '~api/NecodeJson';
import { assertIsValidatorConfig, ParseValidationConfigError, validate } from '@necode-org/policy-dev';
import { endpoint, Status } from "~backend/Endpoint";
import { extractTgz } from '~backend/extract';
import { hasScope } from '~backend/scopes';
import { compileMiKeProgram } from '~backend/mike';
import { Plugin, Prisma, prisma } from "~database";
import { neverResolve } from '~utils/async';
import semver from 'semver';

export const config = {
    api: {
        bodyParser: false,
    },
};

const apiPlugin = endpoint(makePluginEntity, [], {
    type: 'entityType',
    GET: {
        loginValidation: true,
        handler: async ({}, ok) => {
            const plugins = await prisma.plugin.findMany();
            return ok(plugins.map(makePluginEntity));
        }
    },
    POST: {
        loginValidation: true,
        handler: async ({ session, bodyStream }, ok, fail) => {
            if (!await hasScope(session!.user.id, 'plugin:install')) {
                return fail(Status.FORBIDDEN);
            }

            console.log('Passed authorization');

            const files = await extractTgz(bodyStream)
                .catch(() => {
                    fail(Status.BAD_REQUEST, 'Failed to parse plugin as tgz.');
                    return neverResolve();
                })
                .then(async x => Object.fromEntries(await Promise.all(
                    Object.entries(x).map(async ([f, v]) => {
                        if (!f.startsWith('package/')) {
                            fail(Status.BAD_REQUEST, 'Failed to parse plugin as tgz.');
                            return neverResolve();
                        }
                        return [f.slice('package/'.length), v] as const;
                    })
                )));
            
            console.log('extraction successful');

            async function parseJsonFile<T>(filename: string, schema: Schema<T>): Promise<T> {
                if (!(filename in files)) {
                    fail(Status.BAD_REQUEST, `Plugin does not include ${filename}.`);
                    return neverResolve();
                }
                try {
                    const { value, error } = schema.validate(JSON.parse(files[filename].toString('utf-8')), {
                        allowUnknown: true,
                    });
                    if (error) {
                        fail(Status.BAD_REQUEST, error.annotate(true));
                        return neverResolve();
                    }
                    return value;
                }
                catch (e) {
                    fail(Status.BAD_REQUEST, `Failed to parse JSON in ${filename}: ${(e as SyntaxError).message}`);
                    return neverResolve();
                }
            }

            const packageJsonSchemaObj = {
                name: Joi.string(),
                displayName: Joi.string().optional(),
                version: Joi.string(),
            };
            const packageJsonSchema = Joi.object<PackageJson, true>(packageJsonSchemaObj);

            const packageJson = await parseJsonFile('package.json', packageJsonSchema);
            console.log('package.json parsed successfully');

            let {
                frontendRoot = '.',
                entry,
                policyRoot = '.',
                policies,
                packageOverrides,
            } = await parseJsonFile('necode.json', Joi.object<NecodeJson, true>({
                frontendRoot: Joi.string().optional(),
                entry: Joi.string().optional(),
                policyRoot: Joi.string().optional(),
                policies: Joi.array().items(Joi.object({
                    path: Joi.string(),
                    id: Joi.string(),
                    displayName: Joi.string(),
                    config: Joi.any(),
                })).optional(),
                packageOverrides: packageJsonSchema
                    .fork(Object.keys(packageJsonSchemaObj), x => x.optional())
                    .optional(),
            }));
            console.log('necode.json parsed successfully');

            const {
                name,
                displayName,
                version: versionRaw,
            } = { ...packageJson, ...packageOverrides };

            const version = semver.valid(versionRaw);

            if (!version) {
                return fail(Status.BAD_REQUEST, `${version} is not a valid semantic version. See https://semver.org/ for details.`);
            }

            console.log('semver checked');

            const { id: existingPluginId, version: existingPluginVersion } = await prisma.plugin.findUnique({
                where: { name },
                select: { id: true, version: true },
            }) ?? {};

            const isUpgrade = typeof existingPluginVersion === 'string';
            console.log(`isUpgrade: ${isUpgrade}`);

            if (existingPluginVersion) {
                if (!await hasScope(session!.user.id, 'plugin:uninstall', { pluginId: existingPluginId! })) {
                    return fail(Status.FORBIDDEN, 'You are authorized to install new plugins, but not to upgrade existing plugins.');
                }

                if (!semver.gt(version, existingPluginVersion)) {
                    return fail(
                        Status.CONFLICT,
                        `The ${name} plugin already exists with version ${existingPluginVersion}. ` +
                        'Its replacement must have a greater version.'
                    );
                }
            }

            // Normalize paths
            frontendRoot = path.normalize(frontendRoot);
            entry = entry ? path.normalize(entry) : entry;
            policyRoot = path.normalize(policyRoot);
            policies?.forEach(x => x.path = path.normalize(x.path));

            const issues = [] as string[];

            function goesUp(relPath: string) {
                return /^\.\.\//.test(path.join(relPath));
            }

            for (const [name, path] of Object.entries({
                frontendRoot,
                ...entry ? { entry } : {},
                policyRoot,
                ...Object.fromEntries(policies?.map((x, i) => [`policies[${i}].path`, x.path]) ?? []),
            })) {
                if (goesUp(path)) {
                    issues.push(`${name} (${path}) is invalid, paths cannot go upwards`);
                }
            }

            console.log('checked paths');

            let frontendFiles = [] as [string, Buffer][];
            
            if (entry !== undefined) {
                const absEntry = path.join(frontendRoot, entry);
                if (!(absEntry in files)) {
                    issues.push(`Couldn't find entry point at ${absEntry}`);
                }
    
                frontendFiles = Object.keys(files)
                    .filter(x => x.startsWith(frontendRoot))
                    .map(x => [path.relative(frontendRoot, x), files[x]]);
            }

            console.log('checked frontend files');

            if (policies) {
                await Promise.all(policies.map(async policy => {
                    console.log(`checking policy ${policy.id}`);

                    const absPath = path.join(policyRoot, policy.path);
                    if (!(absPath in files)) {
                        issues.push(`Couldn't find policy ${policy.id} at ${absPath}`);
                    }
    
                    if (policy.config) {
                        try {
                            assertIsValidatorConfig(policy.config);
                        }
                        catch (e) {
                            if (e instanceof ParseValidationConfigError) {
                                issues.push(`Invalid validator config for policy ${policy.id}: ${e.message}`);
                                return;
                            }
                        }
                        finally {
                            console.log(`checking policy ${policy.id} - checked config`);
                        }
                    }


                    const mikeSource = files[absPath].toString('utf-8');
    
                    const validationResult = await validate(mikeSource, policy.config ?? {});

                    console.log(`checking policy ${policy.id} - completed validation`);

                    if (!validationResult.ok) {
                        issues.push(`Policy ${policy.id} failed to validate:`);
                        for (const { message, details, severity } of validationResult.messages) {
                            const icon = { info: 'ℹ', warn: '⚠️', error: '🛑' }[severity];
                            issues.push(`\t${icon} ${message}`);
                            details?.forEach(x => issues.push(`\t\t${x}`));
                        }
                    }

                    console.log(`checking policy ${policy.id} done`);
                }));

            }

            if (issues.length > 0) {
                return fail(Status.BAD_REQUEST, issues.join('\n'));
            }

            try {
                const plugin = await prisma.$transaction(async (): Promise<Plugin> => {
                    if (isUpgrade) {
                        await prisma.plugin.delete({ where: { name } });
                        console.log('former plugin deleted');
                    }

                    return prisma.plugin.create({
                        data: {
                            name,
                            displayName,
                            version,
                            entryFilename: entry,
                            files: { createMany: { data: frontendFiles.map(([path, contents]) => ({
                                filename: path,
                                contents,
                            })) } },
                            policies: { createMany: { data: policies?.map(policy => {
                                const absPath = path.join(policyRoot, policy.path);
                                return {
                                    id: policy.id,
                                    displayName: policy.displayName,
                                    source: files[absPath],
                                    compiled: Buffer.from(compileMiKeProgram(files[absPath].toString('utf-8')).compiled!),
                                    validationConfig: policy.config as any ?? {},
                                };
                            }) ?? [] } },
                        }
                    });
                });

                console.log('plugin upload complete');

                return ok(makePluginEntity(plugin));
            }
            catch (e) {
                if (e instanceof Prisma.PrismaClientKnownRequestError) {
                    switch (e.code) {
                        case 'P2002':
                            fail(Status.CONFLICT, 'This plugin would conflict with an existing plugin. Its policies may have the same ID as existing plugins.');
                    }
                }
                throw e;
            }
        }
    }
});

export default apiPlugin;
