import { endpoint, Status } from "~backend/Endpoint";
import { makeClassroomEntity } from "~api/entities/ClassroomEntity";
import { makeClassroomMemberEntity } from "~api/entities/ClassroomMemberEntity";
import { makeLessonEntity } from "~api/entities/LessonEntity";
import { hasScope } from "~backend/scopes";
import { prisma } from "~database";
import { singleArg } from "~utils/typeguards";

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

            if (includeLessons && !await hasScope(session!.user.id, 'classroom:detailed:view', { classroomId })) {
                return fail(Status.FORBIDDEN);
            }

            if (includeMembers && !await hasScope(session!.user.id, 'classroom:member:all:view', { classroomId })) {
                return fail(Status.FORBIDDEN);
            }

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