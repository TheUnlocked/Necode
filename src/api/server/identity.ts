import { IncomingMessage } from "http";
import { Session } from 'next-auth';
import { getSession } from 'next-auth/react';
import { prisma } from '../../db/prisma';
import { hasScope } from './scopes';

export type IdentityError
    = 'not-logged-in'
    | 'cannot-impersonate'
    ;

export default async function getIdentity(req: IncomingMessage): Promise<IdentityError | Session> {
    const nextAuthSession = await getSession({ req });

    if (!nextAuthSession) {
        return 'not-logged-in';
    }

    const impersonate = req.headers.impersonate as string | undefined;
    if (impersonate) {
        if (!await hasScope(nextAuthSession.user.id, 'user:impersonate', { userId: impersonate })) {
            return 'cannot-impersonate';
        }

        return { ...nextAuthSession, user: (await prisma.user.findUnique({ where: { id: impersonate } }))! }
    }

    return nextAuthSession;
}