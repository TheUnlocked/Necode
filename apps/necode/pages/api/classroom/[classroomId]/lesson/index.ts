import Joi from "joi";
import { AttributesOf, endpoint, Status } from "common/api/Endpoint";
import { ActivityEntity, makeActivityEntity } from "api/entities/ActivityEntity";
import { LessonEntity, makeLessonEntity } from "api/entities/LessonEntity";
import { hasScope } from "backend/scopes";
import { Activity, prisma } from "database";
import { iso8601DateRegex } from "common/util/iso8601";
import { singleArg } from "common/util/typeguards";

const apiLessonAll = endpoint(makeLessonEntity, ['classroomId', 'include[]'] as const, {
    type: 'entityType',
    GET: {
        loginValidation: true,
        async handler({ query: { classroomId, include }, session }, ok, fail) {
            if (!await hasScope(session!.user.id, 'classroom:view', { classroomId })) {
                return fail(Status.FORBIDDEN);
            }

            const includeActivities = include.includes('activities');

            const lessons = await prisma.lesson.findMany({
                where: { classroomId },
                include: { activities: includeActivities ? true : { select: { id: true } } }
            });

            return ok(lessons.map(x => makeLessonEntity(x, {
                activities: includeActivities
                    ? (x.activities as Activity[]).map(singleArg(makeActivityEntity))
                    : x.activities.map(x => x.id)
            })));
        }
    },
    POST: {
        loginValidation: true,
        schema: Joi.object<AttributesOf<LessonEntity>>({
            date: Joi.string().regex(iso8601DateRegex),
            displayName: Joi.string().allow(''),
            activities: Joi.array()
                .items(Joi.object<ActivityEntity['attributes']>({
                    displayName: Joi.string(),
                    activityType: Joi.string(),
                    configuration: Joi.any().optional(),
                    enabledLanguages: Joi.array().items(Joi.string())
                }))
                .optional()
        }),
        async handler({ query: { classroomId }, body: { date, displayName, activities }, session }, ok, fail) {
            if (!await hasScope(session!.user.id, 'classroom:edit', { classroomId })) {
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
                    data: (activities as unknown as (ActivityEntity['attributes'])[] | undefined)?.map((x, i) => ({
                        lessonId: lesson.id,
                        activityType: x.activityType,
                        displayName: x.displayName,
                        configuration: x.configuration ?? undefined,
                        enabledLanguages: x.enabledLanguages,
                        order: i
                    })) ?? []
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