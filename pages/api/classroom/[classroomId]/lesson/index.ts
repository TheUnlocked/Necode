import Joi from "joi";
import { endpoint, Status } from "../../../../../src/api/Endpoint";
import { ActivityEntity, makeActivityEntity } from "../../../../../src/api/entities/ActivityEntity";
import { LessonEntity, makeLessonEntity } from "../../../../../src/api/entities/LessonEntity";
import { isInstructor } from "../../../../../src/api/server/validators";
import { prisma } from "../../../../../src/db/prisma";
import { iso8601DateRegex } from "../../../../../src/util/iso8601";
import { singleArg } from "../../../../../src/util/typeguards";

const apiLessonAll = endpoint(makeLessonEntity, ['classroomId', 'include[]'] as const, {
    type: 'entityType',
    GET: {
        loginValidation: true,
        async handler({ query: { classroomId, include }, session }, ok, fail) {
            if (!await isInstructor(session!.user.id, classroomId)) {
                return fail(Status.FORBIDDEN);
            }

            const includeActivities = include.includes('activities');

            const lessons = await prisma.lesson.findMany({
                where: { classroomId },
                include: { activities: includeActivities ? true : { select: { id: true } } }
            });

            return ok(lessons.map(x => makeLessonEntity(x, {
                activities: includeActivities
                    ? x.activities.map(singleArg(makeActivityEntity))
                    : x.activities.map(x => x.id)
            })));
        }
    },
    POST: {
        loginValidation: true,
        schema: Joi.object<LessonEntity['attributes']>({
            date: Joi.string().regex(iso8601DateRegex),
            displayName: Joi.string().allow('').max(100),
            activities: Joi.array()
                .items(Joi.object<ActivityEntity['attributes']>({
                    activityType: Joi.string(),
                    configuration: Joi.any().optional(),
                    enabledLanguages: Joi.array().items(Joi.string())
                }))
                .optional()
        }),
        async handler({ query: { classroomId }, body: { date, displayName, activities }, session }, ok, fail) {
            if (!await isInstructor(session!.user.id, classroomId)) {
                return fail(Status.FORBIDDEN);
            }

            if (await prisma.lesson.count({ where: { classroomId, date: new Date(date) } }) > 0) {
                return fail(Status.BAD_REQUEST, `A lesson already exists on ${date}`);
            }

            const [lesson, acts] = await prisma.$transaction(async () => {
                const lesson = await prisma.lesson.create({
                    data: {
                        displayName,
                        classroomId,
                        date: new Date(date)
                    }
                });

                await prisma.activity.createMany({
                    data: (activities as unknown as (ActivityEntity['attributes'])[]).map((x, i) => ({
                        lessonId: lesson.id,
                        activityType: x.activityType,
                        displayName: 'placeholder',
                        configuration: x.configuration,
                        supportedLanguages: x.enabledLanguages,
                        order: i
                    }))
                });

                const acts = await prisma.activity.findMany({
                    where: { lessonId: lesson.id },
                    orderBy: { order: 'asc' }
                });

                return [lesson, acts] as const;
            });

            return ok(makeLessonEntity(lesson, { activities: acts.map(singleArg(makeActivityEntity)) }));
        }
    }
});

export default apiLessonAll;