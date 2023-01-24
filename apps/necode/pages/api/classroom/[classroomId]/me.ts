import { prisma } from "database";
import { makeClassroomMemberEntity } from "api/entities/ClassroomMemberEntity";
import { endpoint, Status } from "common/api/Endpoint";
import { makeClassroomEntity } from "api/entities/ClassroomEntity";

const apiClassroomMe = endpoint(makeClassroomMemberEntity, ['classroomId', 'include[]'] as const, {
    type: 'entity' as const,
    GET: {
        loginValidation: true,
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