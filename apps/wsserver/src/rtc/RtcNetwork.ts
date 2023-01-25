import { NetworkId, PolicyConfiguration } from '~api/RtcNetwork';
import allPolicies from './policies/allPolicies';
import { RtcCoordinator } from './policies/RtcPolicy';
import RtcManager from './RtcManager';

export class RtcNetwork {
    private rtc: RtcCoordinator;

    constructor(networkId: NetworkId, rtcManager: RtcManager, config: PolicyConfiguration) {
        const policy = allPolicies.find(policy => policy.policyId === config.name);
        if (!policy) {
            console.error(`Could not find RTC policy ${config.name}`);
            this.rtc = {
                onUserJoin() {},
                onUserLeave() {},
            };
        }
        else {
            this.rtc = new policy(networkId, [], { rtc: rtcManager, params: config.params ?? {} });
        }
    }

    onUserJoin(user: string) {
        this.rtc.onUserJoin(user);
    }

    onUserLeave(user: string) {
        this.rtc.onUserLeave(user);
    }
}