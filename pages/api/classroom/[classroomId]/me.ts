import { prisma } from "../../../../src/db/prisma";
import { makeClassroomMemberEntity } from "../../../../src/api/entities/ClassroomMemberEntity";
import { endpoint, Status } from "../../../../src/api/Endpoint";
import { makeClassroomEntity } from "../../../../src/api/entities/ClassroomEntity";

const apiClassroomMe = endpoint(makeClassroomMemberEntity, ['classroomId', 'include[]'] as const, {
    type: 'entity' as const,
    GET: {
        requiresLogin: true,
        handler: async ({ query: { classroomId, include }, session }, ok, fail) => {
            const includeClasses = include.includes('classes');
            const includeClassroom = include.includes('classroom');
            
            const user = await prisma.classroomMembership.findFirst({
                include: {
                    user: { include: { classes:  {
                        include: { classroom: includeClasses }
                    } } },
                    classroom: includeClassroom
                },
                where: {
                    userId: session!.user.id,
                    classroom: { id: classroomId }
                }
            });

            if (!user) {
                return fail(Status.FORBIDDEN);
            }
            
            return ok(makeClassroomMemberEntity(user, {
                classroom: includeClassroom
                    ? makeClassroomEntity(user.classroom)
                    : user.classroomId,
                classes: includeClasses
                    ? user.user.classes.map(x => makeClassroomEntity(x.classroom))
                    : undefined
            }));
        }
    }
});

export default apiClassroomMe;