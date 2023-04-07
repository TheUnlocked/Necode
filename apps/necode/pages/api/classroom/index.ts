import { ClassroomRole } from "~database";
import Joi from "joi";
import { prisma } from "~database";
import { makeClassroomEntity } from "~api/entities/ClassroomEntity";
import { endpoint, Status } from "~backend/Endpoint";
import { hasScope } from "~backend/scopes";

const apiClassroomAll = endpoint(makeClassroomEntity, [], {
    type: 'entityType',
    POST: {
        loginValidation: true,
        schema: Joi.object({
            displayName: Joi.string().min(6).max(100)
        }),
        async handler({ body, session }, ok, fail) {
            if (!await hasScope(session!.user.id, 'classroom:create')) {
                return fail(Status.FORBIDDEN);
            }

            const classroom = await prisma.$transaction(async prisma => {
                const classroom = await prisma.classroom.create({
                    data: {
                        displayName: body.displayName
                    }
                });
                await prisma.classroomMembership.create({
                    data: {
                        classroomId: classroom.id,
                        userId: session!.user.id,
                        role: ClassroomRole.Instructor
                    }
                });
                return classroom;
            });
            return ok(makeClassroomEntity(classroom, { members: [session!.user.id] }));
        }
    }
});

export default apiClassroomAll;