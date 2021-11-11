import { ClassroomRole } from ".prisma/client";
import Joi, { ValidationError } from "joi";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { prisma } from "../../../src/db/prisma";
import { ClassroomEntity, makeClassroomEntity } from "../../../src/api/entities/ClassroomEntity";
import { endpoint, Status } from "../../../src/api/Endpoint";

const handler = endpoint(makeClassroomEntity, [], {
    type: 'entityType',
    POST: {
        requiresLogin: true,
        schema: Joi.object({
            displayName: Joi.string()
        }),
        async handler({ body, session }, ok, fail) {
            if (session?.user.rights === 'Admin') {
                const classroom = await prisma.$transaction(async prisma => {
                    const classroom = await prisma.classroom.create({
                        data: {
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
                return ok(makeClassroomEntity(classroom, { members: [session.user.id] }));
            }
            return fail(Status.FORBIDDEN);
        }
    }
});
