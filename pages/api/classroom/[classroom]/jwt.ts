import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react';
import { SignJWT } from 'jose/jwt/sign';
import { parseJwk } from 'jose/jwk/parse';

type ResponseData = string;


export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ResponseData>
) {
    if (req.method === 'POST') {
        const session = await getSession({ req });
        console.log(session)
        if (session && session.user) {
            const keyObj = JSON.parse(process.env.JWT_SIGNING_PRIVATE_KEY!);
            const key = await parseJwk(keyObj);
            const jwt = await new SignJWT({
                purpose: 'rtc',
                authority: session.user.authority,
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
            return res.status(401).send('Please log in first');
        }
    }
    return res.status(400).send('/classroom/[classroom]/jwt requires POST');
}
