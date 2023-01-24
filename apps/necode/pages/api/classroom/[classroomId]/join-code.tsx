import { endpoint, Status } from 'common/api/Endpoint';
import { hasScope } from 'backend/scopes';
import { prisma } from 'common/db/prisma';

const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
function generateShortCode() {
    return new Array(6).fill(null).map(() => alphabet[Math.floor(alphabet.length * Math.random())]).join('');
}

const apiJoinCode = endpoint(null, ['classroomId'], {
    type: 'other',
    POST: {
        loginValidation: true,
        async handler({ query: { classroomId }, session }, ok, fail) {
            if (!await hasScope(session!.user.id, 'classroom:invite', { classroomId })) {
                return fail(Status.FORBIDDEN);
            }

            // We'll give it 50 attempts. If we're still getting collisions,
            // one more probably isn't going to fix it.
            for (let i = 0; i < 50; i++) {
                try {
                    // We'll check if one already exists each time to avoid race condition issues
                    const existing = await prisma.joinCode.findUnique({ where: { classroomId } });
                    if (existing) {
                        return ok(existing.code);
                    }

                    const result = await prisma.joinCode.create({
                        data: {
                            classroomId,
                            code: generateShortCode()
                        }
                    });
                    return ok(result.code);
                }
                catch (e) {
                    // Try again
                }
            }

            return fail(Status.INTERNAL_SERVER_ERROR, 'All the join codes were taken???');
        }
    },
    DELETE: {
        loginValidation: true,
        async handler({ query: { classroomId }, session }, ok, fail) {
            if (!await hasScope(session!.user.id, 'classroom:invite:refresh', { classroomId })) {
                return fail(Status.FORBIDDEN);
            }

            await prisma.joinCode.delete({ where: { classroomId } });
            
            return ok(undefined);
        }
    }
});

export default apiJoinCode;