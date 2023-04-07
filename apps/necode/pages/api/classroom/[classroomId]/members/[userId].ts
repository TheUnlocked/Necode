import { ClassroomRole } from "~database";
import Joi from "joi";
import { ClassroomMemberEntity, makeClassroomMemberEntity } from "~api/entities/ClassroomMemberEntity";
import { endpoint, Status } from "~backend/Endpoint";
import { hasScope } from "~backend/scopes";
import { prisma } from "~database";

const apiUsers = endpoint(makeClassroomMemberEntity, ['userId', 'classroomId'], {
    type: 'entity',
    GET: {
        loginValidation: true,
        async handler({ session, query: { classroomId, userId } }, ok, fail) {
            if (!await hasScope(session!.user.id, 'classroom:member:view', { classroomId, userId })) {
                return fail(Status.FORBIDDEN);
            }

            const user = await prisma.classroomMembership.findUnique({
                where: { userId_classroomId: { userId, classroomId } },
                include: { user: true }
            });

            if (user) {
                return ok(makeClassroomMemberEntity(user));
            }

            return fail(Status.NOT_FOUND);
        }
    },
    PATCH: {
        loginValidation: true,
        schema: Joi.object<ClassroomMemberEntity['attributes']>({
            role: Joi.alternatives([
                ClassroomRole.Student,
                ClassroomRole.Instructor
            ] as ClassroomRole[]).optional()
        }),
        async handler({ session, query: { classroomId, userId }, body }, ok, fail) {
            if (!await hasScope(session!.user.id, 'classroom:member:edit', { classroomId, userId })) {
                return fail(Status.FORBIDDEN);
            }

            const user = await prisma.classroomMembership.update({
                where: { userId_classroomId: { userId, classroomId } },
                data: {
                    role: body.role
                },
                include: { user: true }
            });

            if (user) {
                return ok(makeClassroomMemberEntity(user));    
            }
            
            return fail(Status.NOT_FOUND);
        }
    },
    DELETE: {
        loginValidation: true,
        async handler({ session, query: { classroomId, userId } }, ok, fail) {

            if (!await hasScope(session!.user.id, 'classroom:member:edit', { classroomId, userId })) {
                return fail(Status.FORBIDDEN);
            }

            const user = await prisma.classroomMembership.delete({
                where: { userId_classroomId: { userId, classroomId } },
            });

            if (user) {
                return ok(undefined);
            }
            
            return fail(Status.NOT_FOUND);
        }
    }
});

export default apiUsers;