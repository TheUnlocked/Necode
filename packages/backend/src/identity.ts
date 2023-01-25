
import { Session, unstable_getServerSession as getServerSession } from 'next-auth';
import { prisma } from '~database';
import { hasScope } from './scopes';
import { IMPERSONATION_COOKIE } from '~api/constants';
import { nextAuthOptions } from './nextAuth';
import { GetServerSidePropsContext } from 'next';

export type IdentityError
    = 'not-logged-in'
    | 'cannot-impersonate'
    ;

export default async function getIdentity(req: GetServerSidePropsContext['req'], res: GetServerSidePropsContext['res']): Promise<IdentityError | Session> {
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