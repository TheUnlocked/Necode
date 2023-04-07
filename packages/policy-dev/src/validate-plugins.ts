import { MultiBar } from 'cli-progress';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { isNotNull } from '~utils/typeguards';
import { NecodeJson } from '~api/NecodeJson';
import { assertIsValidatorConfig, ParseValidationConfigError } from './parsePolicyValidatorConfig';
import { validate } from './validator';

async function findAncestorDirWithFile(startAt: string, filename: string): Promise<string | undefined> {
    if (!await stat(path.join(startAt, filename))) {
        const parent = path.dirname(startAt);
        if (parent === startAt) {
            return;
        }
        return findAncestorDirWithFile(parent, filename);
    }
    return startAt;
}

(async () => {
    
    const rootDir = await findAncestorDirWithFile(process.cwd(), 'package.json');
    if (!rootDir) {
        console.error('Unable to find package.json. Plugins must have a package.json file.');
        return;
    }
    const necodeJsonFile = path.join(rootDir, 'necode.json');
    if (!stat(necodeJsonFile)) {
        console.error('Unable to find necode.json. necode.json must be placed in the same directory as package.json.');
        return;
    }

    const { policyRoot = '.', policies } = JSON.parse(await readFile(necodeJsonFile, { encoding: 'utf-8' })) as NecodeJson;

    if (!policies) {
        console.warn('No policies found in necode.json.');
        return;
    }

    let success = true;

    const progress = new MultiBar({
        format: `{bar} | {name} {result} | {value}/{total} Passed ({percentage}%)`,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        clearOnComplete: false,
        hideCursor: true,
    });

    const NUM_RUNS = 10_000;

    const results = await Promise.all(policies.map(async policy => {
        const payload = { name: policy.id.padEnd(Math.max(...policies.map(x => x.id.length))) };
        const bar = progress.create(NUM_RUNS, 0, { ...payload, result: '.' });

        const policyPath = path.join(rootDir, policyRoot, policy.path);

        if (!await stat(policyPath)) {
            console.error(`Unable to find ${policy.id} at expected location ${policyPath}`);
            success = false;
            bar.update(bar.getProgress(), { ...payload, result: '✖' });
            return;
        }

        const file = await readFile(policyPath, { encoding: 'utf-8' });

        const validatorConfig = policy.config ?? {};

        try {
            assertIsValidatorConfig(validatorConfig);
        }
        catch (e) {
            if (e instanceof ParseValidationConfigError) {
                console.error(`The config property for policy ${policy.id} is misconfigured. See the stack trace below:`);
                console.error(e.stack);
                success = false;
                bar.update(NUM_RUNS, { ...payload, result: '✖' });
                return;
            }
            throw e;
        }

        let progressValue = 0;
        const { ok, messages } = await validate(file, validatorConfig, {
            numRuns: NUM_RUNS,
            onProgress: () => {
                bar.increment();
                if (++progressValue % (NUM_RUNS / 100) === 0) {
                    progress.update();
                }
            },
        });

        if (ok) {
            bar.update(progressValue, { ...payload, result: '✔' });
        }
        else {
            success = false;
            bar.update(progressValue, { ...payload, result: '✖' });
        }

        return [policy.id, messages] as const;
    }));

    progress.stop();
    console.log(''); // newline

    for (const [name, messages] of results.filter(isNotNull)) {
        if (messages.length > 0) {
            console.log(`For ${name}:`);
            for (const { message, details, err, severity } of messages) {
                const print = console[severity];
                const icon = { info: 'ℹ', warn: '⚠️', error: '🛑' }[severity];
                print(`${icon} ${message}`);
                details?.forEach(x => print(`\t${x}`));
                if (err) {
                    if (err instanceof Error) {
                        print(err.stack);
                    }
                    print(err);
                }
            }
        }
    }

    if (success) {
        console.log("✔ Validation Passed.");
        console.log("Passing validation does not mean a plugin's policies are necessarily bug-free.");
        console.log("Other testing is always important to ensure correct behavior.");
    }
    else {
        process.exitCode = 1;
    }
    
})();

