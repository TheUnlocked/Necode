import Joi from "joi";
import { makeConfigurationEntity } from "~api/entities/ConfigurationEntity";
import { Status, endpoint } from "~backend/Endpoint";
import { configOptions } from "~backend/config";
import { hasScope } from "~backend/scopes";
import { prisma } from "~database/server";
import { $in } from "~utils/typeguards";

const apiConfigurationOne = endpoint(makeConfigurationEntity, ['key'], {
    type: 'entity',
    GET: {
        loginValidation: true,
        handler: async ({ query: { key }, session }, ok, fail) => {
            if (!await hasScope(session!.user.id, 'configuration:read', { key })) {
                return fail(Status.FORBIDDEN);
            }

            if (!$in(key, configOptions)) {
                return fail(Status.NOT_FOUND);
            }

            const configSettings = configOptions[key];

            if (configSettings.writeOnly) {
                return fail(Status.FORBIDDEN, `${key} is a write-only configuration option`);
            }

            const config = await prisma.systemConfiguration.upsert({
                where: { key },
                create: {
                    key,
                    value: configSettings.default,
                },
                update: {},
            });

            return ok(makeConfigurationEntity(config));
        }
    },
    PUT: {
        loginValidation: true,
        schema: Joi.object({
            value: Joi.string(),
        }),
        handler: async ({ query: { key }, session, body }, ok, fail) => {
            if (!await hasScope(session!.user.id, 'configuration:write', { key })) {
                return fail(Status.FORBIDDEN);
            }

            if (!$in(key, configOptions)) {
                return fail(Status.NOT_FOUND);
            }

            const config = await prisma.systemConfiguration.upsert({
                where: { key },
                create: {
                    key,
                    value: body.value,
                },
                update: {
                    value: body.value,
                },
            });

            return ok(makeConfigurationEntity(config));
        }
    },
});

export default apiConfigurationOne;
