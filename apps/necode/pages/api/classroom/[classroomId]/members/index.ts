import { endpoint, Status } from "common/api/Endpoint";
import { makeClassroomMemberEntity } from "api/entities/ClassroomMemberEntity";
import { hasScope } from "backend/scopes";
import { prisma } from "database";
import { singleArg } from "common/util/typeguards";

const apiUsers = endpoint(makeClassroomMemberEntity, ['classroomId'], {
    type: 'entityType',
    GET: {
        loginValidation: true,
        async handler({ session, query: { classroomId } }, ok, fail) {
            if (!await hasScope(session!.user.id, 'classroom:view', { classroomId })) {
                return fail(Status.FORBIDDEN);
            }

            const members = await prisma.classroomMembership.findMany({
                where: { classroomId },
                include: { user: true }
            });

            return ok(members.map(singleArg(makeClassroomMemberEntity)));
        }
    }
});

export default apiUsers;