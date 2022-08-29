import { makeActivityEntity } from "../../../../../src/api/entities/ActivityEntity";
import { endpoint, Status } from "../../../../../src/api/Endpoint";
import { prisma } from "../../../../../src/db/prisma";
import { makeLessonEntity } from "../../../../../src/api/entities/LessonEntity";
import Joi from "joi";
import { hasScope } from "../../../../../src/api/server/scopes";

const apiActivityOne = endpoint(makeActivityEntity, ['classroomId', 'activityId', 'include[]'] as const, {
    type: 'entity',
    GET: {
        loginValidation: true,
        async handler({ query: { classroomId, activityId, include }, session }, ok, fail) {
            const includeLesson = include.includes('lesson');

            const hasViewClassroom = await hasScope(session!.user.id, 'classroom:view', { classroomId });

            if ((includeLesson && !hasViewClassroom) || !await hasScope(session!.user.id, 'activity:view', { classroomId })) {
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
                    : hasViewClassroom ? activity.lessonId : undefined
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
            if (!await hasScope(session!.user.id, 'classroom:lesson:edit', { classroomId })) {
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
            if (!await hasScope(session!.user.id, 'classroom:lesson:edit', { classroomId })) {
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