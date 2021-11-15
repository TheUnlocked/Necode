import { makeActivityEntity } from "../../../../../../../src/api/entities/ActivityEntity";
import { endpoint, Status } from "../../../../../../../src/api/Endpoint";
import { isInstructor } from "../../../../../../../src/api/server/validators";
import { prisma } from "../../../../../../../src/db/prisma";
import { makeLessonEntity } from "../../../../../../../src/api/entities/LessonEntity";

const apiActivityOne = endpoint(makeActivityEntity, ['classroomId', 'lessonId?', 'activityId', 'include[]'] as const, {
    type: 'entity',
    GET: {
        loginValidation: true,
        async handler({ query: { classroomId, activityId, lessonId, include }, session }, ok, fail) {
            if (!isInstructor(session?.user.id, classroomId)) {
                return fail(Status.FORBIDDEN);
            }

            const includeLesson = include.includes('lesson');

            const activity = await prisma.activity.findFirst({
                where: { id: activityId },
                include: { lesson: includeLesson }
            });

            if (!activity || (lessonId && activity.lessonId !== lessonId)) {
                return fail(Status.NOT_FOUND);
            }

            return ok(makeActivityEntity(activity, {
                lesson: includeLesson ? makeLessonEntity(activity.lesson) : activity.lessonId
            }));
        }
    },
    DELETE: {
        loginValidation: true,
        async handler({ query: { classroomId, activityId }, session }, ok, fail) {
            if (!isInstructor(session?.user.id, classroomId)) {
                return fail(Status.FORBIDDEN);
            }

            await prisma.activity.delete({
                where: { id: activityId }
            });

            return ok();
        }
    }
});

export default apiActivityOne;