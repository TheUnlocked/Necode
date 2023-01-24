import Joi from "joi";
import { endpoint, Status } from "common/api/Endpoint";
import { ActivityEntity, makeActivityEntity } from "api/entities/ActivityEntity";
import { hasScope } from "backend/scopes";
import { prisma } from "database";

const apiActivityAll = endpoint(makeActivityEntity, ['classroomId', 'lessonId'] as const, {
    type: 'entityType',
    GET: {
        loginValidation: true,
        async handler({ query: { classroomId, lessonId }, session }, ok, fail) {
            if (!await hasScope(session!.user.id, 'classroom:view', { classroomId })) {
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
            displayName: Joi.string().allow(''),
            configuration: Joi.any().optional(),
            enabledLanguages: Joi.array().items(Joi.string()).optional(),
        }),
        async handler({
            query: { classroomId, lessonId },
            body: { activityType, configuration, displayName, enabledLanguages = [] },
            session
        }, ok, fail) {
            if (!await hasScope(session!.user.id, 'classroom:edit', { classroomId })) {
                return fail(Status.FORBIDDEN);
            }

            const activity = await prisma.activity.create({
                data: {
                    lessonId,
                    activityType,
                    displayName,
                    configuration: configuration ?? undefined,
                    enabledLanguages: enabledLanguages,
                    order: await prisma.activity.count({ where: { lessonId } })
                }
            });

            return ok(makeActivityEntity(activity));
        }
    }
});

export default apiActivityAll;