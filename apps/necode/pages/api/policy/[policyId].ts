import { makeRtcPolicyEntity } from '~api/entities/RtcPolicyEntity';
import { endpoint, Status } from '~backend/Endpoint';
import { prisma } from '~database';

const apiPolicy = endpoint(makeRtcPolicyEntity, ['policyId'], {
    type: 'entity',
    GET: {
        loginValidation: true,
        async handler({ query: { policyId } }, ok, fail) {
            const policy = await prisma.rtcPolicy.findUnique({
                where: { id: policyId },
                select: { id: true, displayName: true, validationConfig: true },
            });

            if (!policy) {
                return fail(Status.NOT_FOUND);
            }

            return ok(makeRtcPolicyEntity(policy));
        }
    }
});

export default apiPolicy;
