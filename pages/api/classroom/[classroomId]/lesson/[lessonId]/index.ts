import { Activity } from "@prisma/client";
import Joi from "joi";
import { endpoint, Status } from "../../../../../../src/api/Endpoint";
import { ActivityEntity, makeActivityEntity } from "../../../../../../src/api/entities/ActivityEntity";
import { makeClassroomEntity } from "../../../../../../src/api/entities/ClassroomEntity";
import { ReferenceDepth } from "../../../../../../src/api/entities/EntityReference";
import { LessonEntity, makeLessonEntity } from "../../../../../../src/api/entities/LessonEntity";
import { isInstructor } from "../../../../../../src/api/server/validators";
import { prisma } from "../../../../../../src/db/prisma";
import { isIso8601Date, iso8601DateRegex } from "../../../../../../src/util/iso8601";
import { singleArg } from "../../../../../../src/util/typeguards";

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

const apiLessonOne = endpoint({} as LessonEntity<{ classroom: any, activities: ReferenceDepth }>, ['classroomId', 'lessonId', 'include[]'] as const, {
    type: 'entity',
    GET: {
        loginValidation: true,
        async handler({ query: { classroomId, lessonId, include }, session }, ok, fail) {
            if (!isInstructor(session?.user.id, classroomId)) {
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
    PUT: {
        loginValidation: true,
        schema: Joi.object<LessonEntity['attributes']>({
            date: Joi.string().regex(iso8601DateRegex),
            displayName: Joi.string().allow('').max(100),
            activities: Joi.array()
                .items(Joi.object<ActivityEntity['attributes'] & { id: string }>({
                    id: Joi.string().optional(),
                    activityType: Joi.string(),
                    configuration: Joi.any().optional(),
                    enabledLanguages: Joi.array().items(Joi.string())
                }))
        }),
        async handler({ query: { classroomId, lessonId }, body: { date, displayName, activities }, session }, ok, fail) {
            if (!isInstructor(session?.user.id, classroomId)) {
                return fail(Status.FORBIDDEN);
            }

            lessonId = await maybeGetByIsoDate(lessonId, classroomId) ?? '';

            if (lessonId === '' || await prisma.lesson.count({ where: { id: lessonId, classroomId } }) === 0) {
                return fail(Status.NOT_FOUND);
            }

            const lesson = await prisma.lesson.update({
                include: { activities: {
                    orderBy: { order: 'asc' }
                } },
                where: { id: lessonId },
                data: {
                    date: new Date(date),
                    displayName,
                    activities: {
                        deleteMany: {
                            id: { notIn: activities.map(x => x.id).filter(Boolean) }
                        },
                        upsert: (activities as unknown as (ActivityEntity['attributes'] & { id?: string })[]).map((x, i) => ({
                            where: { id: x.id ?? '' },
                            create: {
                                activityType: x.activityType,
                                displayName: 'placeholder',
                                configuration: x.configuration ?? undefined,
                                supportedLanguages: x.enabledLanguages,
                                order: i
                            },
                            update: {
                                activityType: x.activityType,
                                displayName: 'placeholder',
                                configuration: x.configuration ?? undefined,
                                supportedLanguages: x.enabledLanguages,
                                order: i
                            }
                        }))
                    }
                }
            });

            return ok(makeLessonEntity(lesson, { activities: lesson.activities.map(singleArg(makeActivityEntity)) }));
        }
    },
    DELETE: {
        loginValidation: true,
        async handler({ query: { lessonId, classroomId }, session }, ok, fail) {
            if (!isInstructor(session?.user.id, classroomId)) {
                return fail(Status.FORBIDDEN);
            }

            lessonId = await maybeGetByIsoDate(lessonId, classroomId) ?? '';

            if (lessonId === '') {
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