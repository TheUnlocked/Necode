import { ClassroomRole } from ".prisma/client";
import Joi from "joi";
import { prisma } from "../../../src/db/prisma";
import { makeClassroomEntity } from "../../../src/api/entities/ClassroomEntity";
import { endpoint, Status } from "../../../src/api/Endpoint";

const apiClassroomAll = endpoint(makeClassroomEntity, [], {
    type: 'entityType',
    POST: {
        requiresLogin: true,
        schema: Joi.object({
            displayName: Joi.string().min(8).max(100)
        }),
        async handler({ body, session }, ok, fail) {
            if (session?.user.rights === 'Admin') {
                const classroom = await prisma.$transaction(async prisma => {
                    const classroom = await prisma.classroom.create({
                        data: {
                            displayName: body.displayName
                        }
                    });
                    await prisma.classroomMembership.create({
                        data: {
                            classroomId: classroom.id,
                            userId: session.user.id,
                            role: ClassroomRole.Instructor
                        }
                    });
                    return classroom;
                });
                return ok(makeClassroomEntity(classroom, { members: [session.user.id] }));
            }
            return fail(Status.FORBIDDEN);
        }
    }
});

export default apiClassroomAll;