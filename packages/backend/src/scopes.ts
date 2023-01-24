import { SitewideRights } from '@prisma/client';
import { prisma } from "database";

async function isAdmin(user: string) {
    return await prisma.user.count({ where: {
        id: user,
        rights: 'Admin'
    } }) > 0;
}

async function isAdminOrFaculty(user: string) {
    return await prisma.user.count({ where: {
        id: user,
        OR: [{ rights: 'Admin' }, { rights: 'Faculty' }]
    } }) > 0;
}

async function getSitewideRights(user: string) {
    return (await prisma.user.findUnique({ select: { rights: true }, where: {
        id: user
    } }))?.rights ?? SitewideRights.None;
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

async function hasControlOver(controllerId: string, otherId: string) {
    // Summary of logic:
    //      Admin has permission for anyone, assuming that user exists
    //      Faculty only has permission for their own simulated users
    return (await prisma.$queryRaw<{ ct: number }[]>`
        SELECT COUNT(*) as ct
        FROM "User"
        WHERE
            id = ${otherId} AND
            (
                "simulatedById" = ${controllerId} OR
                EXISTS (
                    SELECT NULL
                    FROM "User"
                    WHERE id = ${controllerId} AND rights = ${SitewideRights.Admin}::"SitewideRights"
                    LIMIT 1
                )
            )
        LIMIT 1
    `)[0].ct > 0;
}

export interface Scopes {
    'user:all:view': undefined;
    'user:view': { userId: string };
    'user:detailed:view': { userId: string }; // Currently unused, see #30
    'user:edit': { userId: string };
    'user:rights:edit': { userId: string, rights: SitewideRights };
    'user:delete': { userId: string };
    'user:impersonate': { userId: string };
    'user:simulated:create': { rights: SitewideRights };
    'classroom:create': undefined;
    'classroom:view': { classroomId: string };
    'classroom:detailed:view': { classroomId: string };
    'classroom:edit': { classroomId: string };
    'classroom:invite': { classroomId: string };
    'classroom:invite:refresh': { classroomId: string };
    'classroom:member:all:view': { classroomId: string };
    'classroom:member:view': { classroomId: string, userId: string };
    'classroom:member:edit': { classroomId: string, userId: string };
    'activity:view': { classroomId: string };
    'activity:run': { classroomId: string };
    'submission:all:view': { classroomId: string };
    'submission:user:view': { classroomId: string, userId: string };
    'submission:create': { classroomId: string };
}

type ScopeArgumentTuples = { [K in keyof Scopes]: Scopes[K] extends undefined ? [K] : [K, Scopes[K]] }[keyof Scopes];

export async function hasScope(userId: string, scope: keyof { [K in keyof Scopes as Scopes[K] extends undefined ? K : never]: undefined }): Promise<boolean>;
export async function hasScope<Scope extends keyof Scopes>(userId: string, scope: Scope, params: Scopes[Scope]): Promise<boolean>;
export async function hasScope(userId: string, ...[scope, data]: ScopeArgumentTuples): Promise<boolean> {
    switch (scope) {
        case 'user:all:view':
            return isAdmin(userId);
        case 'classroom:create':
            return isAdminOrFaculty(userId);
        case 'user:view':
        case 'user:detailed:view':
            return userId === data.userId || await isAdmin(userId);
        case 'user:simulated:create':
            switch (await getSitewideRights(userId)) {
                case 'Admin':
                    return true;
                case 'Faculty':
                    return data.rights === 'None';
            }
            return false;
        case 'user:rights:edit':
            if (data.rights !== 'None' && !await isAdmin(userId)) {
                return false;
            }
            return hasControlOver(userId, data.userId);
        case 'user:delete':
        case 'user:impersonate':
            if (userId === data.userId) {
                return false;
            }
            return hasControlOver(userId, data.userId);
        case 'user:edit':
            return hasControlOver(userId, data.userId);
        case 'classroom:detailed:view':
        case 'classroom:edit':
        case 'classroom:member:all:view':
        case 'classroom:member:edit':
        case 'classroom:invite':
        case 'classroom:invite:refresh':
        case 'submission:all:view':
        case 'activity:run':
            return await isAdmin(userId) || await getRoleInClass(userId, data.classroomId) === 'Instructor';
        case 'classroom:member:view':
        case 'submission:user:view':
            return await isAdmin(userId) || await prisma.classroomMembership.count({
                where: {
                    OR: [
                        // If the user is in the class and is requesting their own data
                        ...(userId === data.userId ? [{ userId }] : []),
                        { userId, role: 'Instructor' }
                    ]
                }
            }) > 0;
        case 'classroom:view':
        case 'activity:view':
        case 'submission:create':
            return await isAdmin(userId) || isInClass(userId, data.classroomId);
    }
}
