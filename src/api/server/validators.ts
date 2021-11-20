import { prisma } from "../../db/prisma";

export async function isInstructor(user: string | undefined, classroom: string | undefined) {
    return await prisma.classroomMembership.count({ where: {
        userId: user,
        classroomId: classroom,
        role: 'Instructor'
    } }) > 0;
}

export async function isInClass(user: string | undefined, classroom: string | undefined) {
    return await prisma.classroomMembership.count({ where: {
        userId: user,
        classroomId: classroom
    } }) > 0;
}

export async function getRole(user: string | undefined, classroom: string | undefined) {
    return (await prisma.classroomMembership.findFirst({ where: {
        userId: user,
        classroomId: classroom
    } }))?.role;
}