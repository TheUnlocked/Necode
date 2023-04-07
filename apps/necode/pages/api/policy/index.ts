import { makeRtcPolicyEntity } from '~api/entities/RtcPolicyEntity';
import { endpoint } from '~backend/Endpoint';
import { prisma } from '~database';
import { singleArg } from '~utils/typeguards';

const apiPolicies = endpoint(makeRtcPolicyEntity, [], {
    type: 'entityType',
    GET: {
        loginValidation: true,
        async handler(_, ok) {
            const policies = await prisma.rtcPolicy.findMany({ select: { id: true, displayName: true, validationConfig: true } });
            return ok(policies.map(singleArg(makeRtcPolicyEntity)));
        }
    }
});

export default apiPolicies;
