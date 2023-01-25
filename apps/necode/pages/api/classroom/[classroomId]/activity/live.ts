import Joi from "joi";
import { importJWK, SignJWT } from "jose";
import { endpoint, Status } from "~backend/Endpoint";
import { PolicyConfiguration } from '~api/RtcNetwork';
import { hasScope } from "~backend/scopes";
import { prisma } from "~database";
import { CreateLiveActivityInfo } from "~api/ws";

async function makeJwt(content: { [propName: string]: unknown }, expireIn: string) {
    const keyObj = JSON.parse(process.env.JWT_SIGNING_PRIVATE_KEY!);
    const key = await importJWK(keyObj);
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
            if (!await hasScope(session!.user.id, 'activity:view', { classroomId })) {
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
            networks: Joi.array().items(Joi.object<PolicyConfiguration>({
                name: Joi.string(),
                params: Joi.object().pattern(Joi.string(), Joi.any()).optional(),
            })).optional(),
        }),
        async handler({ query: { classroomId }, body, session }, ok, fail) {
            if (!hasScope(session!.user.id, 'activity:run', { classroomId })) {
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
                    networks: body.networks ?? [],
                } as CreateLiveActivityInfo)
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
            if (!hasScope(session!.user.id, 'activity:run', { classroomId })) {
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