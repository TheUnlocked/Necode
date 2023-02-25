import { RtcPolicy } from "~database";
import asArray from "~utils/asArray";
import { Entity, EntityType } from "./Entity";
import { PolicyValidatorConfig, Values } from '../PolicyValidatorConfig';

export type RtcPolicyEntity
    = Entity<EntityType.RtcPolicy, {
        displayName: string;
        params: Values[];
    }>;

export function makeRtcPolicyEntity(policy: Pick<RtcPolicy, 'id' | 'displayName' | 'validationConfig'>): RtcPolicyEntity {
    return {
        type: EntityType.RtcPolicy,
        id: policy.id,
        attributes: {
            displayName: policy.displayName,
            params: asArray(policy.validationConfig as PolicyValidatorConfig).flatMap(x => asArray<Values>(x.params ?? [])),
        }
    };
}
