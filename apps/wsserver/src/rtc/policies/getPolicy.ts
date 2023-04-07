import { PolicyValidatorConfig } from '~api/PolicyValidatorConfig';
import { prisma } from '~database';
import createMiKePolicy from './MiKePolicy';
import { RtcCoordinatorFactory } from "./RtcPolicy";

const policyCache = new Map<string, RtcCoordinatorFactory>();

export default async function getPolicy(id: string): Promise<RtcCoordinatorFactory | undefined> {
    const policy = await prisma.rtcPolicy.findUnique({
        where: { id },
        include: { plugin: { select: { id: true, version: true } } }
    });

    if (policy) {
        const mapId = `${policy.plugin.id}+${policy.plugin.version}+${policy.id}`;

        const existing = policyCache.get(mapId);
    
        if (existing) {
            return existing;
        }
    
        const mikePolicy = await createMiKePolicy(policy.id, policy.compiled, policy.validationConfig as PolicyValidatorConfig);
        policyCache.set(mapId, mikePolicy);
        return mikePolicy;
    }

}