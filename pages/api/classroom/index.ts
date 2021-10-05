import { ClassroomRole } from ".prisma/client";
import Joi, { ValidationError } from "joi";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { prisma } from "../../../src/db/prisma";
import { ClassroomEntity, makeClassroomEntity } from "../../../src/api/entities/ClassroomEntity";
import { ok, Response } from "../../../src/api/Response";

export type PostRequestData = Omit<ClassroomEntity['attributes'], 'members'>;

export type PostResponseData = Response<ClassroomEntity>;

const schema = Joi.object<PostRequestData, true>({
    name: Joi.string().regex(/^\w{3,20}$/),
    displayName: Joi.string()
});

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<PostResponseData>
) {
    if (req.method === 'POST') {
        const session = await getSession({ req });
        if (session) {
            if (session.user.rights === 'Admin') {
                try {
                    const body = JSON.parse(req.body) as PostRequestData;
                    Joi.assert(body, schema);

                    const classroom = await prisma.$transaction(async prisma => {
                        const classroom = await prisma.classroom.create({
                            data: {
                                name: body.name,
                                displayName: body.displayName
                            }
                        });
                        await prisma.classroomMembership.create({
                            data: {
                                classroomId: classroom.id,
                                userId: session.user.id,
                                role: ClassroomRole.Instructor
                            }
                        });
                        return classroom;
                    });
                    return ok(res, makeClassroomEntity(classroom, { members: [session.user.id] }));
                }
                catch (e) {
                    console.log(e);
                    return res.status(400).send({
                        response: 'error',
                        message: e instanceof ValidationError ? e.message : 'Bad request'
                    });
                }
            }
            return res.status(403).send({
                response: 'error',
                message: 'Not enough rights'
            });
        }
        return res.status(401).send({
            response: 'error',
            message: 'Not Logged In'
        });
    }
    return res.status(400).send({
        response: 'error',
        message: `${req.method} is not supported on this endpoint`
    });
};