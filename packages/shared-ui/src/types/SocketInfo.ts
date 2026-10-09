import { Socket } from 'socket.io-client';
import { ClientToServerEventMap, ServerToClientEventMap, SignalLiveActivityInfo } from '~api/ws';

export default interface SocketInfo {
    readonly socket: Socket<ServerToClientEventMap, ClientToServerEventMap>;
    readonly iceServers: RTCIceServer[];
    readonly liveActivityInfo?: SignalLiveActivityInfo;
}
