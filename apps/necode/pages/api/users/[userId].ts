import { SitewideRights } from "~database";
import Joi from "joi";
import { endpoint, Status } from "~backend/Endpoint";
import { makeUserEntity } from "~api/entities/UserEntity";
import { hasScope } from "~backend/scopes";
import { prisma } from "~database";

const apiUsers = endpoint(makeUserEntity, ['userId'], {
    type: 'entity',
    GET: {
        loginValidation: true,
        async handler({ session, query: { userId } }, ok, fail) {
            if (!await hasScope(session!.user.id, 'user:view', { userId })) {
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
            // username: Joi.string().optional(),
            displayName: Joi.string().optional(),
            email: Joi.string().optional(),
            firstName: Joi.string().optional(),
            lastName: Joi.string().optional(),
            rights: Joi.alternatives(Object.values(SitewideRights)).optional()
        }),
        async handler({ session, query: { userId }, body }, ok, fail) {
            if (!await hasScope(session!.user.id, 'user:edit', { userId })) {
                return fail(Status.FORBIDDEN);
            }
            if (body.rights && !await hasScope(session!.user.id, 'user:rights:edit', { userId, rights: body.rights })) {
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
    },
    DELETE: {
        loginValidation: true,
        async handler({ session, query: { userId } }, ok, fail) {
            if (!await hasScope(session!.user.id, 'user:delete', { userId })) {
                return fail(Status.FORBIDDEN);
            }

            await prisma.user.delete({ where: { id: userId } });
            ok();
        }
    },
});

export default apiUsers;