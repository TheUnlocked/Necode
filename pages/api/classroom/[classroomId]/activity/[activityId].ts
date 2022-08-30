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
    PATCH: {
        loginValidation: true,
        schema: Joi.object({
            lesson: Joi.string().optional(),
            displayName: Joi.string().allow('').optional(),
            configuration: Joi.any().optional(),
            enabledLanguages: Joi.array().items(Joi.string()).optional(),
            order: Joi.number().optional(),
        }),
        async handler({ query: { classroomId, activityId, include }, body, session }, ok, fail) {
            if (!await hasScope(session!.user.id, 'classroom:edit', { classroomId })) {
                return fail(Status.FORBIDDEN);
            }

            const includeLesson = include.includes('lesson');

            const {
                lesson: lessonId,
                displayName,
                configuration,
                enabledLanguages,
                order,
            } = body as {
                lesson?: string;
                displayName?: string;
                configuration?: any;
                enabledLanguages?: string[];
                order?: number;
            };

            if (lessonId) {
                if (await prisma.lesson.count({ where: { id: lessonId } }) === 0) {
                    return fail(Status.NOT_FOUND, 'The target lesson was not found');
                }
            }

            const activity = await prisma.$transaction(async () => {
                if (order !== undefined) {
                    const {
                        lessonId: currentLessonId,
                        order: currentOrder,
                    } = (await prisma.activity.findUnique({ where: { id: activityId }, select: { lessonId: true, order: true } }))!;
                    
                    await prisma.activity.updateMany({
                        where: { lessonId: lessonId ?? currentLessonId, order: { lte: order } },
                        data: {
                            order: { increment: 1 },
                        }
                    });
                    await prisma.activity.updateMany({
                        where: { lessonId: lessonId ?? currentLessonId, order: { gt: currentOrder } },
                        data: {
                            order: { increment: -1 },
                        }
                    });
                }
                
                return prisma.activity.update({
                    where: { id: activityId },
                    data: {
                        lessonId,
                        displayName,
                        configuration,
                        enabledLanguages,
                        order: lessonId ? await prisma.activity.count({ where: { lessonId } }) : order,
                    },
                    include: { lesson: includeLesson },
                });
            })

            if (!activity) {
                return fail(Status.NOT_FOUND);
            }

            return ok(makeActivityEntity(activity, {
                lesson: includeLesson
                    ? makeLessonEntity(activity.lesson)
                    : activity.lessonId,
            }));
        }
    },
    DELETE: {
        loginValidation: true,
        async handler({ query: { classroomId, activityId }, session }, ok, fail) {
            if (!await hasScope(session!.user.id, 'classroom:edit', { classroomId })) {
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