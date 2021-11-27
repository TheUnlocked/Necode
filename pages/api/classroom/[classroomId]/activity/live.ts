import { Prisma } from ".prisma/client";
import Joi from "joi";
import parseJwk from "jose/jwk/parse";
import SignJWT from "jose/jwt/sign";
import { endpoint, Status } from "../../../../../src/api/Endpoint";
import { isInClass, isInstructor } from "../../../../../src/api/server/validators";
import { prisma } from "../../../../../src/db/prisma";

async function makeJwt(content: { [propName: string]: unknown }, expireIn: string) {
    const keyObj = JSON.parse(process.env.JWT_SIGNING_PRIVATE_KEY!);
    const key = await parseJwk(keyObj);
    const jwt = await new SignJWT(content)
        .setProtectedHeader({ alg: keyObj.alg })
        .setIssuedAt()
        .setExpirationTime(expireIn)
        .sign(key);
    return jwt;
}

const apiActivityLive = endpoint(null, ['classroomId'], {
    type: 'other',
    GET: {
        loginValidation: true,
        async handler({ query: { classroomId }, session }, ok, fail) {
            if (!isInClass(session!.user.id, classroomId)) {
                return fail(Status.FORBIDDEN);
            }

            const isLive = await prisma.liveActivity.count({
                where: { classroomId }
            }) > 0;

            return ok({
                live: isLive,
                server: process.env.WEBSOCKET_SERVER,
                token: await makeJwt({
                    purpose: 'socket',
                    userId: session!.user.id,
                    classroomId
                }, '2h')
            });
        }
    },
    POST: {
        loginValidation: true,
        schema: Joi.object({
            id: Joi.string(),
            data: Joi.any().optional()
        }),
        async handler({ query: { classroomId }, body, session }, ok, fail) {
            if (!isInstructor(session?.user.id, classroomId)) {
                return fail(Status.FORBIDDEN);
            }

            const doesActivityExist = await prisma.activity.count({
                where: { id: body.id }
            }) > 0;

            if (!doesActivityExist) {
                return fail(Status.NOT_FOUND);
            }

            await prisma.liveActivity.upsert({
                where: { classroomId },
                create: {
                    classroomId,
                    activityId: body.id,
                    data: body.data ?? undefined
                },
                update: {
                    activityId: body.id,
                    data: body.data ?? undefined
                }
            });
            
            const response = await fetch(`${process.env.WEBSOCKET_SERVER?.replace(/\/$/, '')}/internal/${classroomId}/activity`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: await makeJwt({
                        purpose: 'internal'
                    }, '5s')
                },
                body: JSON.stringify({
                    id: body.id,
                    data: body.data ?? undefined
                })
            });

            // TODO: If fails to send, should also fail to start activity

            if (!response.ok) {
                return fail(response.status, await response.text());
            }
            
            return ok(undefined);
        }
    },
    DELETE: {
        loginValidation: true,
        async handler({ query: { classroomId }, session }, ok, fail) {
            if (!isInstructor(session?.user.id, classroomId)) {
                return fail(Status.FORBIDDEN);
            }

            const result = await prisma.liveActivity.delete({
                where: {
                    classroomId
                }
            });

            if (!result) {
                return fail(Status.NOT_FOUND);
            }

            const response = await fetch(`${process.env.WEBSOCKET_SERVER?.replace(/\/$/, '')}/internal/${classroomId}/activity`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: await makeJwt({
                        purpose: 'internal'
                    }, '5s')
                }
            });

            if (!response.ok) {
                return fail(response.status, await response.text());
            }

            return ok(undefined);
        }
    }
});

export default apiActivityLive;