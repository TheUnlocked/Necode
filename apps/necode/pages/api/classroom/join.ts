import slowDown from 'express-slow-down';
import Joi from 'joi';
import { endpoint, Status } from 'common/api/Endpoint';
import { makeClassroomEntity } from 'common/api/entities/ClassroomEntity';
import { prisma } from 'common/db/prisma';


const apiClassroomJoin = endpoint(null, [], {
    type: 'other',
    middleware: [slowDown({
        delayMs: 100,
        maxDelayMs: 1000
    })],
    POST: {
        loginValidation: true,
        schema: Joi.object({
            code: Joi.string()
        }),
        async handler({ body: { code }, session }, ok, fail) {
            if (code.length !== 6) {
                return fail(Status.FORBIDDEN);
            }

            const codeInfo = await prisma.joinCode.findUnique({ where: { code } });

            if (!codeInfo) {
                return fail(Status.FORBIDDEN);
            }

            const alreadyInClassroom = await prisma.classroomMembership.count({ where: {
                userId: session!.user.id,
                classroomId: codeInfo.classroomId
            } }) > 0;

            if (!alreadyInClassroom) {
                await prisma.classroomMembership.create({
                    data: {
                        userId: session!.user.id,
                        classroomId: codeInfo.classroomId,
                        role: 'Student'
                    }
                });
            }

            const classroomInfo = await prisma.classroom.findUnique({ where: { id: codeInfo.classroomId } });

            return ok(makeClassroomEntity(classroomInfo!));
        }
    }
});

export default apiClassroomJoin;