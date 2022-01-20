import { endpoint, Status } from "../../../../../src/api/Endpoint";
import { makeClassroomMemberEntity } from "../../../../../src/api/entities/ClassroomMemberEntity";
import { hasScope } from "../../../../../src/api/server/scopes";
import { prisma } from "../../../../../src/db/prisma";
import { singleArg } from "../../../../../src/util/typeguards";

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