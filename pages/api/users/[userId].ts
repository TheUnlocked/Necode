import { SitewideRights, User } from "@prisma/client";
import Joi from "joi";
import { endpoint, Status } from "../../../src/api/Endpoint";
import { makeUserEntity } from "../../../src/api/entities/UserEntity";
import { paginationParams } from "../../../src/api/server/standardParams";
import { isAdmin } from "../../../src/api/server/validators";
import { prisma } from "../../../src/db/prisma";
import { singleArg } from "../../../src/util/typeguards";

const apiUsers = endpoint(makeUserEntity, ['userId'], {
    type: 'entity',
    GET: {
        loginValidation: true,
        async handler({ session, query: { userId } }, ok, fail) {
            if (userId !== session!.user.id && !await isAdmin(session!.user.id)) {
                return fail(Status.FORBIDDEN);
            }

            const user = await prisma.user.findUnique({ where: { id: userId } });

            if (user) {
                return ok(makeUserEntity(user));
            }
            return fail(Status.NOT_FOUND);
        }
    },
    PATCH: {
        loginValidation: true,
        schema: Joi.object({
            username: Joi.string().optional(),
            displayName: Joi.string().optional(),
            email: Joi.string().optional(),
            firstName: Joi.string().optional(),
            lastName: Joi.string().optional(),
            rights: Joi.alternatives(
                SitewideRights.None,
                SitewideRights.Admin,
            ).optional()
        }),
        async handler({ session, query: { userId }, body }, ok, fail) {
            if (!await isAdmin(session!.user.id)) {
                return fail(Status.FORBIDDEN);
            }

            const user = await prisma.user.update({
                where: { id: userId },
                data: {
                    username: body.username,
                    displayName: body.displayName,
                    email: body.email,
                    firstName: body.firstName,
                    lastName: body.lastName,
                    rights: body.rights,
                }
            });

            if (user) {
                return ok(makeUserEntity(user));    
            }
            
            return fail(Status.NOT_FOUND);
        }
    }
});

export default apiUsers;