import { NextApiRequest, NextApiResponse } from 'next';
import nextAuth from 'next-auth';
import { getNextAuthOptions } from '~backend/nextAuth';

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
    return await nextAuth(req, res, await getNextAuthOptions());
}