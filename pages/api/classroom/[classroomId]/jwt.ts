import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react';
import { SignJWT } from 'jose/jwt/sign';
import { parseJwk } from 'jose/jwk/parse';
import { prisma } from '../../../../src/db/prisma';
import { AuthLevel } from '../../../../websocketServer/src/types';
import { endpoint, EndpointMap } from '../../../../src/api/Endpoint';


export default async function apiClassroomJwt(
    req: NextApiRequest,
    res: NextApiResponse<string>
) {
    if (req.method === 'POST') {
        const session = await getSession({ req });

        const classroomMembership = await prisma.classroomMembership.findFirst({
            select: {
                role: true
            },
            where: {
                userId: session?.user.id,
                classroom: { id: req.query.classroom as string }
            }
        });
        
        if (session && session.user) {
            const keyObj = JSON.parse(process.env.JWT_SIGNING_PRIVATE_KEY!);
            const key = await parseJwk(keyObj);
            const jwt = await new SignJWT({
                purpose: 'rtc',
                authority: classroomMembership?.role === 'Instructor' ? AuthLevel.Instructor : AuthLevel.Joined,
                classroom: req.query.classroom,
                username: session.user.username
            })
                .setProtectedHeader({ alg: keyObj.alg })
                .setIssuedAt()
                .setExpirationTime('2h')
                .sign(key);
            return res.send(jwt);
        }
        else {
            return res.status(401).send('Not Logged In');
        }
    }
    return res.status(400).send('/classroom/[classroom]/jwt requires POST');
}