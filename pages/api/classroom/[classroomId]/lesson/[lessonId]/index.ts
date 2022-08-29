import { Activity, Classroom, Lesson } from "@prisma/client";
import Joi from "joi";
import { endpoint, PartialAttributesOf, Status } from "../../../../../../src/api/Endpoint";
import { makeActivityEntity } from "../../../../../../src/api/entities/ActivityEntity";
import { makeClassroomEntity } from "../../../../../../src/api/entities/ClassroomEntity";
import { ReferenceDepth } from "../../../../../../src/api/entities/EntityReference";
import { LessonEntity, makeLessonEntity } from "../../../../../../src/api/entities/LessonEntity";
import { hasScope } from "../../../../../../src/api/server/scopes";
import { prisma } from "../../../../../../src/db/prisma";
import { isIso8601Date, iso8601DateRegex } from "../../../../../../src/util/iso8601";
import { includes, singleArg } from "../../../../../../src/util/typeguards";

async function maybeGetByIsoDate(lessonIdOrDate: string, classroomId: string) {
    if (isIso8601Date(lessonIdOrDate)) {
        const found = await prisma.lesson.findFirst({
            select: { id: true },
            where: { classroomId, date: new Date(lessonIdOrDate) }
        });

        if (!found) {
            return undefined;
        }

        return found.id;
    }
    return lessonIdOrDate;
}

const apiLessonOne = endpoint({} as LessonEntity<{ classroom: any, activities: ReferenceDepth }>, ['classroomId', 'lessonId', 'include[]', 'merge?'] as const, {
    type: 'entity',
    GET: {
        loginValidation: true,
        async handler({ query: { classroomId, lessonId, include }, session }, ok, fail) {
            if (!await hasScope(session!.user.id, 'classroom:view', { classroomId })) {
                return fail(Status.FORBIDDEN);
            }

            const includeActivities = include.includes('activities');
            const includeClassroom = include.includes('classroom');

            lessonId = await maybeGetByIsoDate(lessonId, classroomId) ?? '';

            if (lessonId === '') {
                return fail(Status.NOT_FOUND);
            }

            const lesson = await prisma.lesson.findFirst({
                where: { id: lessonId, classroomId },
                include: {
                    activities: { orderBy: { order: 'asc' }, select: includeActivities ? undefined : { id: true } },
                    classroom: includeClassroom
                }
            });

            if (!lesson) {
                return fail(Status.NOT_FOUND);
            }

            return ok(makeLessonEntity(lesson, {
                activities: includeActivities
                    ? (lesson.activities as Activity[]).map(singleArg(makeActivityEntity))
                    : (lesson.activities as { id: string }[]).map(x => x.id),
                classroom: includeClassroom
                    ? makeClassroomEntity(lesson.classroom)
                    : lesson.classroomId
            }));
        }
    },
    PATCH: {
        loginValidation: true,
        schema: Joi.object<PartialAttributesOf<LessonEntity>>({
            date: Joi.string().regex(iso8601DateRegex).optional(),
            displayName: Joi.string().allow('').max(100).optional(),
        }),
        async handler({ query: { classroomId, lessonId: lessonIdOrDate, include, merge }, body: { date, displayName }, session }, ok, fail) {
            if (!await hasScope(session!.user.id, 'classroom:lesson:edit', { classroomId })) {
                return fail(Status.FORBIDDEN);
            }

            const lessonId = await maybeGetByIsoDate(lessonIdOrDate, classroomId);

            if (!lessonId || await prisma.lesson.count({ where: { classroomId, id: lessonId } }) === 0) {
                return fail(Status.NOT_FOUND);
            }

            const mergeType = merge ?? 'reject';

            if (!includes(['reject', 'replace', 'combine'] as const, mergeType)) {
                return fail(Status.BAD_REQUEST, "Query parameter merge must be one of 'reject', 'replace', 'combine'");
            }

            const includeActivities = include.includes('activities');
            const includeClassroom = include.includes('classroom');

            const includeQueryPart = {
                activities: { orderBy: { order: 'asc' }, select: includeActivities ? undefined : { id: true } },
                classroom: includeClassroom
            } as const;

            let lesson: undefined | Lesson & {
                classroom: Classroom;
                activities: {}[];
            };

            if (date !== undefined) {
                if (!isIso8601Date(date)) {
                    return fail(Status.BAD_REQUEST, 'Invalid date');
                }

                const mergeLesson = await prisma.lesson.findUnique({ where: { classroomId_date: { classroomId, date: new Date(date) } } });
                if (mergeLesson && mergeLesson.id !== lessonId) {
                    switch (mergeType) {
                        case 'reject':
                            return fail(Status.CONFLICT, `A lesson already exists on ${date}`);
                        case 'replace':
                            [, lesson] = await prisma.$transaction([
                                prisma.lesson.delete({ where: { id: mergeLesson.id } }),
                                prisma.lesson.update({
                                    where: { id: lessonId },
                                    data: {
                                        date: new Date(date),
                                        ...displayName !== undefined ? { displayName } : undefined,
                                    },
                                    include: includeQueryPart,
                                })
                            ]);
                        case 'combine':
                            [,, lesson] = await prisma.$transaction([
                                prisma.activity.updateMany({
                                    where: { lessonId: mergeLesson.id },
                                    data: {
                                        lessonId,
                                        order: {
                                            // query intentionally not part of the transaction
                                            increment: ((await prisma.activity.aggregate({
                                                where: { lessonId },
                                                _max: {
                                                    order: true
                                                }
                                            }))._max.order ?? 0) + 1
                                        }
                                    }
                                }),
                                prisma.lesson.delete({ where: { id: mergeLesson.id } }),
                                prisma.lesson.update({
                                    where: { id: lessonId },
                                    data: {
                                        date: new Date(date),
                                        ...displayName !== undefined ? { displayName } : undefined,
                                    },
                                    include: includeQueryPart,
                                })
                            ]);
                            break;
                    }
                }
            }

            if (lesson === undefined) {
                lesson = await prisma.lesson.update({
                    where: { id: lessonId },
                    data: {
                        ...displayName !== undefined ? { displayName } : undefined,
                    },
                    include: includeQueryPart,
                });
            }

            return ok(makeLessonEntity(lesson, {
                activities: includeActivities
                    ? (lesson.activities as Activity[]).map(singleArg(makeActivityEntity))
                    : (lesson.activities as { id: string }[]).map(x => x.id),
                classroom: includeClassroom
                    ? makeClassroomEntity(lesson.classroom)
                    : lesson.classroomId
            }));
        }
    },
    DELETE: {
        loginValidation: true,
        async handler({ query: { lessonId: lessonIdOrDate, classroomId }, session }, ok, fail) {
            if (!await hasScope(session!.user.id, 'classroom:lesson:edit', { classroomId })) {
                return fail(Status.FORBIDDEN);
            }

            const lessonId = await maybeGetByIsoDate(lessonIdOrDate, classroomId);

            if (!lessonId) {
                return fail(Status.NOT_FOUND);
            }

            const result = await prisma.lesson.delete({
                where: { id: lessonId }
            });

            if (!result) {
                return fail(Status.NOT_FOUND);
            }

            return ok();
        }
    }
});

export default apiLessonOne;