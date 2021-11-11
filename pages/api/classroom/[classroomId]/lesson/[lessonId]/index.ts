import { endpoint, Status } from "../../../../../../src/api/Endpoint";
import { makeLessonEntity } from "../../../../../../src/api/entities/LessonEntity";
import { isInstructor } from "../../../../../../src/api/validators";
import { prisma } from "../../../../../../src/db/prisma";

const handler = endpoint(makeLessonEntity, ['classroomId', 'lessonId'] as const, {
    type: 'entity',
    GET: {
        loginValidation: true,
        async handler({ query: { classroomId, lessonId }, session }, ok, fail) {
            if (!isInstructor(session?.user.id, classroomId)) {
                return fail(Status.FORBIDDEN);
            }

            const lesson = await prisma.lesson.findFirst({
                where: { id: lessonId, classroomId },
                include: { activities: { select: { id: true } } }
            });

            if (!lesson) {
                return fail(Status.NOT_FOUND);
            }

            return ok(makeLessonEntity(lesson, { activities: lesson.activities.map(x => x.id) }));
        }
    },
    DELETE: {
        loginValidation: true,
        async handler({ query: { lessonId, classroomId }, session }, ok, fail) {
            if (!isInstructor(session?.user.id, classroomId)) {
                return fail(Status.FORBIDDEN);
            }

            await prisma.lesson.delete({
                where: { id: lessonId }
            });

            return ok();
        }
    }
});

export default handler;