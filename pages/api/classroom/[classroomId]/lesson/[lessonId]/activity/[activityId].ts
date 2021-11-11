import { makeActivityEntity } from "../../../../../../../src/api/entities/ActivityEntity";
import { endpoint, Status } from "../../../../../../../src/api/Endpoint";
import { isInstructor } from "../../../../../../../src/api/validators";
import { prisma } from "../../../../../../../src/db/prisma";

const handler = endpoint(makeActivityEntity, ['classroomId', 'lessonId', 'activityId'] as const, {
    type: 'entity',
    GET: {
        loginValidation: true,
        async handler({ query: { classroomId, activityId }, session }, ok, fail) {
            if (!isInstructor(session?.user.id, classroomId)) {
                return fail(Status.FORBIDDEN);
            }

            const activity = await prisma.activity.findFirst({
                where: { id: activityId }
            });

            if (!activity) {
                return fail(Status.NOT_FOUND);
            }

            return ok(makeActivityEntity(activity));
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

export default handler;