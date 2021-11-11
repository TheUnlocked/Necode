import { prisma } from "../../../../src/db/prisma";
import { makeClassroomMemberEntity } from "../../../../src/api/entities/ClassroomMemberEntity";
import { Endpoint, endpoint, Status } from "../../../../src/api/Endpoint";

const handler = endpoint(makeClassroomMemberEntity, ['classroomId'] as const, {
    type: 'entity',
    GET: {
        requiresLogin: true,
        handler: async ({ query, session }, ok, fail) => {
            const user = await prisma.classroomMembership.findFirst({
                include: {
                    user: true
                },
                where: {
                    userId: session!.user.id,
                    classroom: { id: query.classroomId }
                }
            });

            if (!user) {
                return fail(Status.FORBIDDEN);
            }
            
            return ok(makeClassroomMemberEntity(user));
        }
    }
});

export default handler;