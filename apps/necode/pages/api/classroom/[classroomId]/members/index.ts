import { makeClassroomMemberEntity } from "~api/entities/ClassroomMemberEntity";
import { endpoint, Status } from "~backend/Endpoint";
import { hasScope } from "~backend/scopes";
import { prisma } from "~database/server";
import { singleArg } from "~utils/typeguards";

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