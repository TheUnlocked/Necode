import { makeActivityEntity } from "../../../../../src/api/entities/ActivityEntity";
import { endpoint, Status } from "../../../../../src/api/Endpoint";
import { getRole, isInstructor } from "../../../../../src/api/server/validators";
import { prisma } from "../../../../../src/db/prisma";
import { makeLessonEntity } from "../../../../../src/api/entities/LessonEntity";
import Joi from "joi";

const apiActivityOne = endpoint(makeActivityEntity, ['classroomId', 'activityId', 'include[]'] as const, {
    type: 'entity',
    GET: {
        loginValidation: true,
        async handler({ query: { classroomId, activityId, include }, session }, ok, fail) {
            const role = await getRole(session?.user.id, classroomId);

            const includeLesson = include.includes('lesson');

            if (!role || (includeLesson && role !== 'Instructor')) {
                return fail(Status.FORBIDDEN);
            }

            const activity = await prisma.activity.findFirst({
                where: { id: activityId },
                include: { lesson: includeLesson }
            });

            if (!activity) {
                return fail(Status.NOT_FOUND);
            }

            return ok(makeActivityEntity(activity, {
                lesson: includeLesson
                    ? makeLessonEntity(activity.lesson)
                    : role === 'Instructor' ? activity.lessonId : undefined
            }));
        }
    },
    PUT: {
        loginValidation: true,
        schema: Joi.object({
            configuration: Joi.any().optional(),
            enabledLanguages: Joi.array().items(Joi.string()).optional()
        }),
        async handler({ query: { classroomId, activityId }, body, session }, ok, fail) {
            if (!isInstructor(session!.user.id, classroomId)) {
                return fail(Status.FORBIDDEN);
            }

            const activity = await prisma.activity.update({
                where: { id: activityId },
                data: {
                    configuration: body.configuration,
                    enabledLanguages: body.enabledLanguages
                }
            });

            if (!activity) {
                return fail(Status.NOT_FOUND);
            }

            return ok(makeActivityEntity(activity));
        }
    },
    DELETE: {
        loginValidation: true,
        async handler({ query: { classroomId, activityId }, session }, ok, fail) {
            if (!isInstructor(session?.user.id, classroomId)) {
                return fail(Status.FORBIDDEN);
            }

            const result = await prisma.activity.delete({
                where: { id: activityId }
            });

            if (!result) {
                return fail(Status.NOT_FOUND);
            }

            return ok(undefined);
        }
    }
});

export default apiActivityOne;