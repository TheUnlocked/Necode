import AutoRing from '../../../../src/util/AutoRing';
import { ArrayKeyMap } from '../../../../src/util/maps/ArrayKeyMap';
import { ConnectionInfo, RtcCoordinator, RtcPolicySettings, rtcPolicy } from './RtcPolicy';

@rtcPolicy
export class RingPolicy implements RtcCoordinator {
    public static policyId = 'ring';

    private ring: AutoRing<string>;
    private connectionMap = new ArrayKeyMap<[string, string], ConnectionInfo>();

    constructor(users: Iterable<string>, private settings: RtcPolicySettings) {
        this.ring = new AutoRing<string>(users, {
            linkHandler: (a, b) => {
                console.log(a, '->', b);
                this.connectionMap.set([a, b], this.settings.rtc.createWebRtcConnection(a, b, { 'role': 'send' }, { 'role': 'recv' }));
            },
            unlinkHandler: (a, b) => {
                console.log(a, '-X', b);
                this.connectionMap.get([a, b])?.destroyWebRtcConnection();
                this.connectionMap.delete([a, b]);
            }
        });
    }
    
    onUserJoin(user: string): void {
        this.ring.add(user);
    }
    onUserLeave(user: string): void {
        this.ring.remove(user);
    }
}