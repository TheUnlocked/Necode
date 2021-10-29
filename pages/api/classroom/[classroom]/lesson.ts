import { NextApiRequest, NextApiResponse } from "next";
import { ok, Response } from "../../../../src/api/Response";
import { prisma } from "../../../../src/db/prisma";

export type GetResponseData = Response<LessonEntity[]>;

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ResponseData>
) {
    if (req.method === 'GET') {
        try {
            

            return res.status(401).send({
                response: 'error',
                message: 'Not Logged In'
            });
        }
        catch (e) {
            return res.status(500).send({
                response: 'error',
                message: `Internal server error`
            });
        }
    }

    return res.status(400).send({
        response: 'error',
        message: `${req.method} is not supported on this endpoint`
    });
};