import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { prisma } from "../../src/db/prisma";
import { Response } from "../../src/api/Response";
import type { IncomingMessage } from "http";
import { makeUserEntity, UserEntity } from "../../src/api/entities/UserEntity";

export type ResponseData = Response<UserEntity>;

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
        const user = await prisma.user.findFirst({
            include: {
                classes: {
                    select: {
                        classroomId: true
                    }
                }
            },
            where: {
                id: session.user.id
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
                data: makeUserEntity(user, { classes: user.classes.map(x => x.classroomId) })
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