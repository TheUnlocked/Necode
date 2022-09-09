import { IncomingMessage, ServerResponse } from "http";
import { Session, unstable_getServerSession as getServerSession } from 'next-auth';
import { prisma } from '../../db/prisma';
import { hasScope } from './scopes';
import { IMPERSONATION_COOKIE } from '../../hooks/useImpersonation';
import { nextAuthOptions } from './nextAuth';

export type IdentityError
    = 'not-logged-in'
    | 'cannot-impersonate'
    ;

export default async function getIdentity(req: IncomingMessage & { cookies: Partial<{ [key: string]: string }> }, res: ServerResponse): Promise<IdentityError | Session> {
    const nextAuthSession = await getServerSession(req, res, nextAuthOptions);

    if (!nextAuthSession) {
        return 'not-logged-in';
    }

    const impersonate = req.cookies[IMPERSONATION_COOKIE] as string | undefined;
    
    if (impersonate) {
        if (!await hasScope(nextAuthSession.user.id, 'user:impersonate', { userId: impersonate })) {
            return 'cannot-impersonate';
        }

        return { ...nextAuthSession, user: (await prisma.user.findUnique({ where: { id: impersonate } }))! };
    }

    return nextAuthSession;
}