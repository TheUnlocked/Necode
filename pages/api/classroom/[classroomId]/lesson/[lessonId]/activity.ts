import Joi from "joi";
import { endpoint, Status } from "../../../../../../src/api/Endpoint";
import { ActivityEntity, makeActivityEntity } from "../../../../../../src/api/entities/ActivityEntity";
import { isInstructor } from "../../../../../../src/api/server/validators";
import { prisma } from "../../../../../../src/db/prisma";

const apiActivityAll = endpoint(makeActivityEntity, ['classroomId', 'lessonId'] as const, {
    type: 'entityType',
    GET: {
        loginValidation: true,
        async handler({ query: { classroomId, lessonId }, session }, ok, fail) {
            if (!await isInstructor(session!.user.id, classroomId)) {
                return fail(Status.FORBIDDEN);
            }

            const activities = await prisma.activity.findMany({
                where: { lessonId }
            });

            return ok(activities.map(x => makeActivityEntity(x)));
        }
    },
    POST: {
        loginValidation: true,
        schema: Joi.object<ActivityEntity['attributes']>({
            activityType: Joi.string(),
            configuration: Joi.any(),
        }),
        async handler({ query: { classroomId, lessonId }, body: { activityType, configuration }, session }, ok, fail) {
            if (!await isInstructor(session!.user.id, classroomId)) {
                return fail(Status.FORBIDDEN);
            }

            const activity = await prisma.activity.create({
                data: {
                    lessonId,
                    activityType,
                    displayName: 'placeholder',
                    configuration: configuration ?? undefined,
                    supportedLanguages: [],
                    order: await prisma.activity.count({ where: { lessonId } })
                }
            });

            return ok(makeActivityEntity(activity));
        }
    }
});

export default apiActivityAll;