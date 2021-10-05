import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { prisma } from "../../../../src/db/prisma";
import { ClassroomMemberEntity, makeClassroomMemberEntity } from "../../../../src/api/entities/ClassroomMemberEntity";
import { ok, Response } from "../../../../src/api/Response";

export type ResponseData = Response<ClassroomMemberEntity>;

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ResponseData>
) {
    if (req.method === 'GET') {
        try {
            const classroom = req.query.classroom as string;
            const session = await getSession({ req });
            if (session) {
                const user = await prisma.classroomMembership.findFirst({
                    include: {
                        user: true
                    },
                    where: {
                        userId: session.user.id,
                        classroom: { name: classroom }
                    }
                });
                if (!user) {
                    return res.status(403).send({
                        response: 'error',
                        message: 'Not a member of the classroom'
                    });
                }
                return ok(res, makeClassroomMemberEntity(user));
            }

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