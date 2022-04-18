import { SitewideRights } from "@prisma/client";
import { endpoint, Status } from "../../../src/api/Endpoint";
import { makeUserEntity } from "../../../src/api/entities/UserEntity";
import { paginationParams } from "../../../src/api/server/standardParams";
import { hasScope } from "../../../src/api/server/scopes";
import { prisma } from "../../../src/db/prisma";
import Joi from 'joi';

const apiUsersSimulated = endpoint(makeUserEntity, paginationParams, {
    type: 'entityType',
    POST: {
        loginValidation: true,
        schema: Joi.object({
            username: Joi.string(),
            displayName: Joi.string(),
            email: Joi.string(),
            firstName: Joi.string(),
            lastName: Joi.string(),
            rights: Joi.alternatives(Object.values(SitewideRights))
        }),
        async handler({ session, body }, ok, fail) {
            if (!await hasScope(session!.user.id, 'user:simulated:create', { rights: body.rights })) {
                return fail(Status.FORBIDDEN);
            }

            const user = await prisma.user.create({
                data: {
                    username: body.username,
                    displayName: body.displayName,
                    email: body.email,
                    firstName: body.firstName,
                    lastName: body.lastName,
                    rights: body.rights,
                    simulatedById: session!.user.id,
                }
            });

            return ok(makeUserEntity(user));
        }
    }
});

export default apiUsersSimulated;