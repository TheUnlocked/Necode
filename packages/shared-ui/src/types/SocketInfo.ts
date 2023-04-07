import { ClientToServerEventMap, ServerToClientEventMap, SignalLiveActivityInfo } from '~api/ws';
import { Socket } from 'socket.io-client';

export default interface SocketInfo {
    readonly socket: Socket<ServerToClientEventMap, ClientToServerEventMap>;
    readonly iceServers: RTCIceServer[];
    readonly liveActivityInfo?: SignalLiveActivityInfo;
}
