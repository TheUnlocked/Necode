import { endpoint, Status } from "../../../../src/api/Endpoint";
import { makeClassroomEntity } from "../../../../src/api/entities/ClassroomEntity";
import { makeClassroomMemberEntity } from "../../../../src/api/entities/ClassroomMemberEntity";
import { makeLessonEntity } from "../../../../src/api/entities/LessonEntity";
import { hasScope } from "../../../../src/api/server/scopes";
import { prisma } from "../../../../src/db/prisma";
import { singleArg } from "../../../../src/util/typeguards";

const apiClassroomOne = endpoint(makeClassroomEntity, ['classroomId', 'include[]'], {
    type: 'entity',
    GET: {
        loginValidation: true,
        async handler({ query: { classroomId, include }, session }, ok, fail) {
            if (!await hasScope(session!.user.id, 'classroom:view', { classroomId })) {
                fail(Status.FORBIDDEN);
            }

            const includeLessons = include.includes('lessons');
            const includeMembers = include.includes('members');

            if (includeMembers) {
                const classroom = (await prisma.classroom.findUnique({
                    where: { id: classroomId },
                    include: {
                        lessons: includeLessons,
                        members: {
                            include: {
                                user: true
                            }
                        }
                    }
                }))!;

                return ok(makeClassroomEntity(classroom, {
                    members: classroom.members.map(singleArg(makeClassroomMemberEntity)),
                    lessons: includeLessons
                        ? classroom.lessons.map(singleArg(makeLessonEntity))
                        : undefined
                }));
            }
            else {
                const classroom = (await prisma.classroom.findUnique({
                    where: { id: classroomId },
                    include: {
                        lessons: includeLessons
                    }
                }))!;

                return ok(makeClassroomEntity(classroom, {
                    lessons: includeLessons
                        ? classroom.lessons.map(singleArg(makeLessonEntity))
                        : undefined
                }));
            }
        }
    }
});

export default apiClassroomOne;