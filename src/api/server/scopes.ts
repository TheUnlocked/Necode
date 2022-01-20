import { prisma } from "../../db/prisma";

async function isAdmin(user: string) {
    return await prisma.user.count({ where: {
        id: user,
        rights: 'Admin'
    } }) > 0;
}

async function isInClass(user: string, classroom: string) {
    return await prisma.classroomMembership.count({ where: {
        userId: user,
        classroomId: classroom
    } }) > 0;
}

async function getRoleInClass(user: string, classroom: string) {
    return (await prisma.classroomMembership.findFirst({ where: {
        userId: user,
        classroomId: classroom
    } }))?.role;
}

export interface Scopes {
    'users:view': undefined;
    'user:view': { userId: string };
    'user:edit': { userId: string };
    'classrooms:create': undefined;
    'classroom:edit': { classroomId: string };
    'classroom:invite': { classroomId: string };
    'classroom:invite:refresh': { classroomId: string };
    'classroom:view': { classroomId: string };
    'activity:view': { classroomId: string };
    'activity:run': { classroomId: string };
    'submissions:view:all': { classroomId: string };
    'submissions:view': { classroomId: string, userId: string };
    'submissions:create': { classroomId: string };
}

type ScopeArgumentTuples = { [K in keyof Scopes]: Scopes[K] extends undefined ? [K] : [K, Scopes[K]] }[keyof Scopes];

export async function hasScope<Scope extends keyof Scopes>(userId: string, scope: keyof { [K in keyof Scopes as Scopes[K] extends undefined ? K : never]: undefined }): Promise<boolean>;
export async function hasScope<Scope extends keyof Scopes>(userId: string, scope: Scope, params: Scopes[Scope]): Promise<boolean>;
export async function hasScope(userId: string, ...info: ScopeArgumentTuples): Promise<boolean> {
    switch (info[0]) {
        case 'users:view':
        case 'user:edit':
        case 'classrooms:create':
            return isAdmin(userId);
        case 'user:view':
            return userId === info[1].userId || await isAdmin(userId);
        case 'classroom:view':
        case 'classroom:edit':
        case 'classroom:invite':
        case 'classroom:invite:refresh':
        case 'submissions:view:all':
            return await isAdmin(userId) || await getRoleInClass(userId, info[1].classroomId) === 'Instructor';
        case 'activity:run':
            return await getRoleInClass(userId, info[1].classroomId) === 'Instructor';
        case 'submissions:view':
            return await isAdmin(userId) || await prisma.classroomMembership.count({
                where: {
                    OR: [
                        // If the user is in the class and is requesting their own data
                        ...(userId === info[1].userId ? [{ userId }] : []),
                        { userId, role: 'Instructor' }
                    ]
                }
            }) > 0;
        case 'activity:view':
        case 'submissions:create':
            return isInClass(userId, info[1].classroomId);
    }
}
