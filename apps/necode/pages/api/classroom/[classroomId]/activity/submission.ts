import { Activity, ActivitySubmission, User } from "database";
import { endpoint, Status } from "common/api/Endpoint";
import { makeActivityEntity } from "api/entities/ActivityEntity";
import { makeActivitySubmissionEntity } from "api/entities/ActivitySubmissionEntity";
import { EntityType } from "api/entities/Entity";
import { makeUserEntity } from "api/entities/UserEntity";
import { hasScope } from "backend/scopes";
import { prisma } from "database";

const apiActivitySubmissionAll = endpoint(makeActivitySubmissionEntity, ['classroomId', 'activityId?', 'userId?', 'version?', 'include[]'], {
    type: 'entityType',
    GET: {
        loginValidation: true,
        async handler({ query: { classroomId, activityId, userId, version, include }, session }, ok, fail) {
            if (version && !/^(?:[0-9]+|all|latest)$/.test(version)) {
                return fail(Status.BAD_REQUEST, `Invalid version number '${version}', must be a positive integer, 'all', or 'latest'`);
            }
            
            if (!userId && !await hasScope(session!.user.id, 'submission:all:view', { classroomId })) {
                // If a user without submission:all:view is querying this endpoint, they should get their own data.
                userId = session!.user.id;
            }

            if (userId && !await hasScope(session!.user.id, 'submission:user:view', { classroomId, userId })) {
                return fail(Status.FORBIDDEN);
            }

            if (!activityId) {
                activityId = (await prisma.liveActivity.findUnique({
                    select: { activityId: true },
                    where: { classroomId }
                }))?.activityId;

                if (!activityId) {
                    return fail(Status.BAD_REQUEST, `If no activity is live, an 'activityId' query parameter must be provided`);
                }
            }

            const includeUser = include.includes('user');

            const includeActivity = include.includes('activity');

            // Prisma doesn't support what we need for latest, so it's raw query time.
            if (!version || version === 'latest') {
                let rawQuerySubmissions: (ActivitySubmission & User & Activity)[];
                if (userId) {
                    rawQuerySubmissions = await prisma.$queryRaw`
                        SELECT s1.*, a.*, u.*
                        FROM "ActivitySubmission" AS s1
                        INNER JOIN "Activity" AS a
                        ON s1."activityId" = a."id"
                        INNER JOIN "User" AS u
                        ON s1."userId" = u."id"
                        WHERE s1."activityId" = ${activityId}
                        AND s1."userId" = ${userId}
                        AND s1."version" = (
                            SELECT max(s2."version") FROM "ActivitySubmission" AS s2
                            WHERE s2."activityId" = ${activityId}
                            AND s2."userId" = ${userId}
                        )
                    `;
                }
                else {
                    rawQuerySubmissions = await prisma.$queryRaw`
                        SELECT s1.*, a.*, u.*
                        FROM "ActivitySubmission" AS s1
                        INNER JOIN "Activity" AS a
                        ON s1."activityId" = a."id"
                        INNER JOIN "User" AS u
                        ON s1."userId" = u."id"
                        WHERE s1."activityId" = ${activityId}
                        AND s1."version" = (
                            SELECT max(s2."version") FROM "ActivitySubmission" AS s2
                            WHERE s2."activityId" = ${activityId}
                            AND s1."userId" = s2."userId"
                        )
                    `;
                }

                return ok(rawQuerySubmissions.map(x => makeActivitySubmissionEntity(x, {
                    user: includeUser
                        ? {
                            id: x.userId,
                            type: EntityType.User,
                            attributes: {
                                username: x.username,
                                displayName: x.displayName,
                                email: x.email,
                                firstName: x.firstName,
                                lastName: x.lastName,
                                rights: x.rights,
                                classes: undefined,
                                simulatedUsers: undefined,
                            }
                        } : x.userId,
                    activity: includeActivity
                        ? {
                            id: x.activityId,
                            type: EntityType.Activity,
                            attributes: {
                                activityType: x.activityType,
                                configuration: x.configuration,
                                enabledLanguages: x.enabledLanguages,
                                displayName: x.displayName,
                                lesson: undefined
                            }
                        }
                        : x.activityId
                })));
            }

            const submissions = await prisma.activitySubmission.findMany({
                include: {
                    activity: includeActivity,
                    user: includeUser
                },
                where: {
                    version: version === 'all' ? undefined : +version,
                    activityId,
                    userId
                }
            });

            return ok(submissions.map(x => makeActivitySubmissionEntity(x, {
                activity: includeActivity
                    ? makeActivityEntity(x.activity)
                    : x.activityId,
                user: includeUser
                    ? makeUserEntity(x.user)
                    : x.userId
            })));
        }
    },
    POST: {
        handler(_, _ok, fail) {
            return fail(Status.NOT_IMPLEMENTED, 'Submissions over the REST API are not permitted. Submit over a socket connection instead.');
        }
    },
    // DELETE: {
    //     loginValidation: true,
    //     async handler({ query, body, session }, ok, fail) {

    //     }
    // }
});

export default apiActivitySubmissionAll;