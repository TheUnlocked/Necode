import { useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientToServerEventMap, LiveActivityInfo, ServerToClientEventMap } from '../../websocketServer/src/types';
import { useGetRequest } from '../api/client/GetRequestHook';

export interface SocketInfo {
    readonly socket: Socket<ServerToClientEventMap, ClientToServerEventMap>;
    readonly iceServers: RTCIceServer[];
    readonly liveActivityInfo?: LiveActivityInfo;
}

export default function useSocket(classroomId: string): SocketInfo | undefined {
    const [socket, setSocket] = useState<Socket<ServerToClientEventMap, ClientToServerEventMap> | undefined>();
    const [liveActivityInfo, setLiveActivityInfo] = useState<LiveActivityInfo>();

    const { data: socketData } = useGetRequest<{ server: string, token: string }>(
        classroomId ? `/api/classroom/${classroomId}/activity/live` : null,
        { revalidateOnFocus: false }
    );

    const { data: iceServers } = useGetRequest<RTCIceServer[]>(
        classroomId ? `/api/classroom/${classroomId}/activity/ice` : null,
        {
            revalidateOnFocus: false,
            refreshInterval: /* Refresh every 90 minutes */ 1000 * 60 * 90,
            refreshWhenHidden: true,
        }
    );

    useEffect(() => {
        if (socketData) {
            const ws = io(socketData.server) as Socket<ServerToClientEventMap, ClientToServerEventMap>;
            
            // let connected = false;
    
            // ws.onAny(console.log);
    
            ws.on('connect', async () => {
                ws.emit('join', socketData.token, authorized => {
                    if (authorized) {
                        setSocket(ws);
                    }
                    else {
                        // TODO: Show error
                    }
                });
            });

            ws.on('startActivity', setLiveActivityInfo);

            ws.on('endActivity', () => setLiveActivityInfo(undefined));
    
            return () => { ws.close() };
        }
    }, [socketData]);

    return useMemo(() => socket && iceServers
        ? { socket, liveActivityInfo, iceServers }
        : undefined,
    [liveActivityInfo, socket, iceServers]);
}