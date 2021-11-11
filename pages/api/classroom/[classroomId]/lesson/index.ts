import Joi from "joi";
import { endpoint, Status } from "../../../../../src/api/Endpoint";
import { ActivityEntity } from "../../../../../src/api/entities/ActivityEntity";
import { LessonEntity, makeLessonEntity } from "../../../../../src/api/entities/LessonEntity";
import { isInstructor } from "../../../../../src/api/validators";
import { prisma } from "../../../../../src/db/prisma";
import { iso8601DateRegex } from "../../../../../src/util/iso8601";

const handler = endpoint(makeLessonEntity, ['classroomId'] as const, {
    type: 'entityType',
    GET: {
        loginValidation: true,
        async handler({ query: { classroomId }, session }, ok, fail) {
            if (!await isInstructor(session!.user.id, classroomId)) {
                return fail(Status.FORBIDDEN);
            }

            const lessons = await prisma.lesson.findMany({
                where: { classroomId },
                include: { activities: { select: { id: true } } }
            });

            return ok(lessons.map(x => makeLessonEntity(x, { activities: x.activities.map(x => x.id) })));
        }
    },
    POST: {
        loginValidation: true,
        schema: Joi.object<LessonEntity['attributes']>({
            /** ISO-8601 Date only, will break in 8000 years */
            date: Joi.string().regex(iso8601DateRegex),
            displayName: Joi.string().max(100),
            activities: Joi.array()
                .items(Joi.object<ActivityEntity['attributes']>({
                    activityType: Joi.string(),
                    configuration: Joi.any()
                }))
                .optional()
        }),
        async handler({ query: { classroomId }, body: { date, displayName, activities }, session }, ok, fail) {
            if (!await isInstructor(session!.user.id, classroomId)) {
                return fail(Status.FORBIDDEN);
            }

            if (await prisma.lesson.findFirst({ select: {}, where: { classroomId, date: new Date(date) } })) {
                return fail(Status.BAD_REQUEST, `A lesson already exists on ${date}`);
            }

            const [lesson, activityIds] = await prisma.$transaction(async () => {
                const lesson = await prisma.lesson.create({
                    data: {
                        displayName,
                        classroomId,
                        date: new Date(date)
                    }
                });

                await prisma.activity.createMany({
                    data: (activities as ActivityEntity[]).map((x, i) => ({
                        lessonId: lesson.id,
                        activityType: x.attributes.activityType,
                        displayName: 'placeholder',
                        configuration: x.attributes.configuration,
                        supportedLanguages: [],
                        order: i
                    }))
                });

                const activityIds = await prisma.activity.findMany({
                    select: { id: true },
                    where: { lessonId: lesson.id },
                    orderBy: { order: 'asc' }
                });

                return [lesson, activityIds] as const;
            });

            ok(makeLessonEntity(lesson, { activities: activityIds.map(x => x.id) }))
        }
    }
});

export default handler;