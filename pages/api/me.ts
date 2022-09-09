import { prisma } from "../../src/db/prisma";
import { makeUserEntity } from "../../src/api/entities/UserEntity";
import { endpoint, Status } from "../../src/api/Endpoint";
import { makeClassroomEntity } from "../../src/api/entities/ClassroomEntity";

const apiMe = endpoint(makeUserEntity, ['include[]'], {
    type: 'entity',
    GET: {
        loginValidation: false,
        handler: async ({ query: { include }, session }, ok, fail) => {
            const includeClasses = include.includes('classes');
            const includeSimulatedUsers = include.includes('simulatedUsers');

            const user = await prisma.user.findFirst({
                include: {
                    classes: {
                        include: { classroom: includeClasses }
                    },
                    ownsSimulated: includeSimulatedUsers ? {
                        orderBy: { id: 'asc' }
                    } : undefined
                },
                where: {
                    id: session!.user.id
                }
            });

            if (!user) {
                return fail(Status.NOT_FOUND);
            }
            
            return ok(makeUserEntity(user, {
                classes: includeClasses
                    ? user.classes.map(x => makeClassroomEntity(x.classroom))
                    : user.classes.map(x => x.classroomId),
                simulatedUsers: includeSimulatedUsers
                    ? user.ownsSimulated.map(x => makeUserEntity(x))
                    : undefined,
            }));
        }
    }
});

export default apiMe;
