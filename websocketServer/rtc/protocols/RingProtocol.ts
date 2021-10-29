import AutoRing from '../../../src/util/AutoRing';
import { ArrayKeyMap } from '../../../src/util/maps/ArrayKeyMap';
import { Username } from '../../types';
import { ConnectionInfo, IProtocol, IProtocolSettings, protocol } from './IProtocol';

@protocol
export class RingProtocol implements IProtocol {
    public protocolId = 'ring';

    private ring: AutoRing<Username>;
    private connectionMap = new ArrayKeyMap<[Username, Username], ConnectionInfo>();

    constructor(users: Iterable<Username>, private settings: IProtocolSettings) {
        this.ring = new AutoRing<Username>(users, {
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
    
    onUserJoin(user: Username): void {
        this.ring.add(user);
    }
    onUserLeave(user: Username): void {
        this.ring.remove(user);
    }
}