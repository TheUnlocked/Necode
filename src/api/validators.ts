import { prisma } from "../db/prisma";

export async function isInstructor(user: string | undefined, classroom: string | undefined) {
    const exists = await prisma.classroomMembership.findFirst({ select: {}, where: {
        userId: user,
        classroomId: classroom
    } });
    return Boolean(exists);
}