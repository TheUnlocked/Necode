import { prisma } from "../../src/db/prisma";
import { makeUserEntity } from "../../src/api/entities/UserEntity";
import { endpoint, Status } from "../../src/api/Endpoint";

const apiMe = endpoint(makeUserEntity, [], {
    type: 'entity',
    GET: {
        requiresLogin: true,
        handler: async ({ session }, ok, fail) => {
            const user = await prisma.user.findFirst({
                include: {
                    classes: {
                        select: {
                            classroomId: true
                        }
                    }
                },
                where: {
                    id: session!.user.id
                }
            });

            if (!user) {
                return fail(Status.NOT_FOUND);
            }
            
            return ok(makeUserEntity(user, { classes: user.classes.map(x => x.classroomId) }));
        }
    }
});

export default apiMe;
