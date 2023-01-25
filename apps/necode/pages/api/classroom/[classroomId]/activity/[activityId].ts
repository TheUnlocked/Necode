import { makeActivityEntity } from "api/entities/ActivityEntity";
import { endpoint, Status } from "common/api/Endpoint";
import { prisma } from "database";
import { makeLessonEntity } from "api/entities/LessonEntity";
import Joi from "joi";
import { hasScope } from "backend/scopes";
import { clamp } from 'lodash';
import { Activity, Lesson } from 'database';

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
                lesson: targetLessonId,
                displayName,
                configuration,
                enabledLanguages,
                order: targetOrder,
            } = body as {
                lesson?: string;
                displayName?: string;
                configuration?: any;
                enabledLanguages?: string[];
                order?: number;
            };

            if (targetLessonId) {
                if (await prisma.lesson.count({ where: { id: targetLessonId } }) === 0) {
                    return fail(Status.NOT_FOUND, 'The target lesson was not found');
                }
            }

            const thisActivity = await prisma.activity.findUnique({ where: { id: activityId }, select: { lessonId: true, order: true } });

            if (!thisActivity) {
                return fail(Status.NOT_FOUND);
            }

            const { lessonId: originalLessonId, order: originalOrder } = thisActivity;

            let activity: Activity & {
                lesson: Lesson;
            };

            if (targetLessonId && targetLessonId !== originalLessonId) {
                // Moving to another lesson
                if (targetOrder !== undefined && targetOrder !== originalOrder) {
                    const normalizedOrder = clamp(
                        targetOrder,
                        0,
                        await prisma.activity.count({ where: { lessonId: targetLessonId } })
                    );

                    [, activity] = await prisma.$transaction([
                        // Shift activities after destination in target lesson forward to make room
                        prisma.activity.updateMany({
                            where: { lessonId: targetLessonId, order: { gte: targetOrder } },
                            data: { order: { increment: 1 } },
                        }),
                        // Move this activity to its destination
                        prisma.activity.update({
                            where: { id: activityId },
                            data: {
                                lessonId: targetLessonId,
                                order: normalizedOrder,
                                displayName,
                                configuration,
                                enabledLanguages,
                            },
                            include: { lesson: includeLesson },
                        }),
                        // Shift activities after the source in the original lesson backwards
                        prisma.activity.updateMany({
                            where: { lessonId: originalLessonId, order: { gt: originalOrder } },
                            data: { order: { decrement: 1 } },
                        }),
                    ]);
                }
                else {
                    [activity] = await prisma.$transaction([
                        // Move this activity to its destination
                        prisma.activity.update({
                            where: { id: activityId },
                            data: {
                                lessonId: targetLessonId,
                                order: await prisma.activity.count({ where: { lessonId: targetLessonId } }),
                                displayName,
                                configuration,
                                enabledLanguages,
                            },
                            include: { lesson: includeLesson },
                        }),
                        // Shift activities after the source in the original lesson backwards
                        prisma.activity.updateMany({
                            where: { lessonId: originalLessonId, order: { gt: originalOrder } },
                            data: { order: { decrement: 1 } },
                        }),
                    ]);
                }
            }
            else {
                // Moving within the same lesson
                if (targetOrder !== undefined && targetOrder !== originalOrder) { 
                    const normalizedOrder = clamp(
                        targetOrder,
                        0,
                        await prisma.activity.count({ where: { lessonId: originalLessonId } }) - 1
                    );

                    const [lowerBound, upperBound, increment] = targetOrder > originalOrder ? [originalOrder + 1, targetOrder, -1] : [targetOrder, originalOrder - 1, 1];
                    
                    [, activity] = await prisma.$transaction([
                        // Shift activities between the source and destination
                        prisma.activity.updateMany({
                            where: { lessonId: originalLessonId, AND: [{ order: { gte: lowerBound } }, { order: { lte: upperBound } }] },
                            data: { order: { increment } },
                        }),
                        // Move the target activity to its correct location and update
                        prisma.activity.update({
                            where: { id: activityId },
                            data: {
                                order: normalizedOrder,
                                displayName,
                                configuration,
                                enabledLanguages,
                            },
                            include: { lesson: includeLesson },
                        }),
                    ]);
                }
                else {
                    // Just update the user without touching the order
                    activity = await prisma.activity.update({
                        where: { id: activityId },
                        data: {
                            displayName,
                            configuration,
                            enabledLanguages,
                        },
                        include: { lesson: includeLesson },
                    });
                }
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