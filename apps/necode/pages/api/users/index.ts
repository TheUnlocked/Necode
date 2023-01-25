import { User } from "~database";
import { endpoint, Status } from "~backend/Endpoint";
import { makeUserEntity } from "~api/entities/UserEntity";
import { paginationParams } from "~backend/standardParams";
import { hasScope } from "~backend/scopes";
import { prisma } from "~database";
import { singleArg } from "~utils/typeguards";

const apiUsers = endpoint(makeUserEntity, [...paginationParams, 'includeSimulated?'], {
    type: 'entityType',
    GET: {
        loginValidation: true,
        async handler({ session, query: {
            'page:index': _pageIndex,
            'page:from': from,
            'page:count': recordsPerPage = 10,
            includeSimulated: includeSimulatedText,
        } }, ok, fail) {
            if (!await hasScope(session!.user.id, 'user:all:view')) {
                return fail(Status.FORBIDDEN);
            }

            recordsPerPage = +recordsPerPage;

            if (isNaN(recordsPerPage) || recordsPerPage % 1 !== 0 || recordsPerPage < 1) {
                return fail(Status.BAD_REQUEST, 'page:count must be a postive interger');
            }

            let pageIndex: number | undefined = undefined;

            if (_pageIndex !== undefined) {
                pageIndex = +_pageIndex;
                if (isNaN(pageIndex) || pageIndex % 1 !== 0 || pageIndex < 0) {
                    return fail(Status.BAD_REQUEST, 'page:index must be a postive interger');
                }
            }

            const includeSimulated = includeSimulatedText === 'true' ? true : false;

            let users: User[];

            if (from) {
                users = await prisma.user.findMany({
                    skip: 1,
                    take: recordsPerPage,
                    cursor: {
                        id: from
                    },
                    orderBy: {
                        id: 'asc'
                    },
                    where: {
                        simulatedBy: includeSimulated ? undefined : null
                    }
                });
            }
            else {
                pageIndex ??= 0;
                users = await prisma.user.findMany({
                    skip: pageIndex * recordsPerPage,
                    take: recordsPerPage,
                    orderBy: {
                        id: 'asc'
                    },
                    where: {
                        simulatedBy: includeSimulated ? undefined : null
                    }
                });
            }

            const numRecords = await prisma.user.count();

            if (users.length > 0) {
                return ok(users.map(singleArg(makeUserEntity)), {
                    pagination: {
                        cursor: users[users.length - 1].id,
                        index: pageIndex !== undefined ? pageIndex : undefined,
                        count: recordsPerPage,
                        pages: Math.ceil(numRecords / recordsPerPage),
                        total: numRecords
                    }
                });
            }
            else {
                return ok([], {
                    pagination: {
                        index: pageIndex ?? 0,
                        count: recordsPerPage,
                        pages: Math.ceil(numRecords / recordsPerPage),
                        total: numRecords
                    }
                });
            }
        }
    }
});

export default apiUsers;