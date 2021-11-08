import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { prisma } from "../../../../src/db/prisma";
import { ClassroomMemberEntity, makeClassroomMemberEntity } from "../../../../src/api/entities/ClassroomMemberEntity";
import { Response } from "../../../../src/api/Response";
import type { IncomingMessage } from "http";

export type ResponseData = Response<ClassroomMemberEntity>;

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ResponseData>
) {
    try {
        if (req.method === 'GET') {
                const { status, content } = await getMe(req, req.query.classroom as string);
                return res.status(status).send(content);
            }
        }
    catch (e) {
        return res.status(500).send({
            response: 'error',
            message: `Internal server error`
        });
    }

    return res.status(400).send({
        response: 'error',
        message: `${req.method} is not supported on this endpoint`
    });
};

export async function getMe(req: IncomingMessage, classroom: string) {
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
            return {
                status: 403,
                content: {
                    response: 'error' as const,
                    message: 'Not a member of the classroom'
                }
            };
        }
        return {
            status: 200,
            content: {
                response: 'ok' as const,
                data: makeClassroomMemberEntity(user)
            }
        };
    }
    return {
        status: 401,
        content: {
            response: 'error' as const,
            message: 'Not Logged In'
        }
    };
}