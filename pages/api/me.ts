import { prisma } from "../../src/db/prisma";
import { makeUserEntity } from "../../src/api/entities/UserEntity";
import { endpoint, Status } from "../../src/api/Endpoint";
import { makeClassroomEntity } from "../../src/api/entities/ClassroomEntity";

const apiMe = endpoint(makeUserEntity, ['include[]'], {
    type: 'entity',
    GET: {
        requiresLogin: true,
        handler: async ({ query: { include }, session }, ok, fail) => {
            const includeClasses = include.includes('classes');

            const user = await prisma.user.findFirst({
                include: {
                    classes: {
                        include: { classroom: includeClasses }
                    }
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
                    : user.classes.map(x => x.classroomId)
            }));
        }
    }
});

export default apiMe;
