import { endpoint, Status } from "../../../../src/api/Endpoint";
import { makeClassroomEntity } from "../../../../src/api/entities/ClassroomEntity";
import { makeClassroomMemberEntity } from "../../../../src/api/entities/ClassroomMemberEntity";
import { makeLessonEntity } from "../../../../src/api/entities/LessonEntity";
import { isInstructor } from "../../../../src/api/server/validators";
import { prisma } from "../../../../src/db/prisma";
import { singleArg } from "../../../../src/util/typeguards";

const apiClassroomOne = endpoint(makeClassroomEntity, ['classroomId', 'include[]'], {
    type: 'entity',
    GET: {
        loginValidation: true,
        async handler({ query: { classroomId, include }, session }, ok, fail) {
            const includeLessons = include.includes('lessons');
            const includeMembers = include.includes('members');

            if (includeLessons || includeMembers) {
                const classroom = await prisma.classroom.findFirst({
                    where: { id: classroomId, members: { some: { role: 'Instructor', userId: session!.user.id } } },
                    include: {
                        lessons: true,
                        members: {
                            include: { 
                                user: true
                            }
                        }
                    }
                });

                if (!classroom) {
                    return fail(Status.FORBIDDEN);
                }

                return ok(makeClassroomEntity(classroom, {
                    members: includeMembers
                        ? classroom.members.map(singleArg(makeClassroomMemberEntity))
                        : undefined,
                    lessons: includeLessons
                        ? classroom.lessons.map(singleArg(makeLessonEntity))
                        : undefined
                }));
            }
            else {
                const classroom = await prisma.classroom.findFirst({
                    where: { id: classroomId, members: { some: { userId: session!.user.id } } }
                });

                if (!classroom) {
                    return fail(Status.FORBIDDEN);
                }

                return ok(makeClassroomEntity(classroom));
            }
        }
    }
});

export default apiClassroomOne;