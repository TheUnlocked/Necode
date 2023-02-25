import { NetworkId, PolicyConfiguration } from '~api/RtcNetwork';
import { SignalData } from '~api/ws';
import getCoordinatorFactory from './policies/getPolicy';
import { RtcCoordinator } from './policies/RtcPolicy';
import RtcManager from './RtcManager';

export class RtcNetwork {

    private constructor(private rtc: RtcCoordinator) {

    }

    static async create(networkId: NetworkId, rtcManager: RtcManager, config: PolicyConfiguration) {
        const policy = await getCoordinatorFactory(config.name);
        if (!policy) {
            throw new Error(`Could not find RTC policy ${config.name}`);
        }
        if (!await policy.validate(config.params)) {
            throw new Error(`Could not initialize RTC policy ${config.name}: Parameters failed to validate`);
        }
        return new RtcNetwork(new policy(networkId, [], { rtc: rtcManager, params: config.params ?? {} }));
    }

    onUserJoin(user: string) {
        this.rtc.onUserJoin(user);
    }

    onUserLeave(user: string) {
        this.rtc.onUserLeave(user);
    }

    signal(user: string, event: string, data: SignalData) {
        this.rtc.signal(user, event, data);
    }
}