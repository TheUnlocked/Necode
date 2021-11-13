import { prisma } from "../../db/prisma";

export async function isInstructor(user: string | undefined, classroom: string | undefined) {
    return await prisma.classroomMembership.count({ where: {
        userId: user,
        classroomId: classroom
    } }) > 0;
}