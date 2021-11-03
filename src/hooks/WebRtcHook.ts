import { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { AuthLevel, ClientToServerEventMap, ClientToServerOrders, ServerToClientEventMap, Username } from '../../websocketServer/src/types';
import Peer from 'simple-peer';
import tracked from '../util/trackedEventEmitter';

export function useSignalingWebsocket(classroom: string) {
    const [wsInstance, setWs] = useState<Socket<ServerToClientEventMap, ClientToServerEventMap> | undefined>();
    const [authLevel, setAuthLevel] = useState(AuthLevel.None);

    // dev
    let usernameRef = useRef("" as Username);

    useEffect(() => {
        if (classroom) {
            const ws = io(`${window.location.hostname}:3011`, { port: '3011' }) as Socket<ServerToClientEventMap, ClientToServerEventMap>;
            // let connected = false;
    
            // ws.onAny(console.log);
    
            ws.on('connect', async () => {
                const jwt = await (await fetch(`/api/classroom/${classroom}/jwt`, { method: 'POST' })).text();
                ws.emit('join', jwt, (response) => {
                    if (response.authority !== AuthLevel.Denied) {
                        const { authority: authLevel, user: forUsername, classroom: inClassroom } = response;

                        if (classroom === inClassroom) {
                            // dev
                            usernameRef.current = forUsername;
    
                            // // Only need to setWs the first time.
                            // if (!connected) {
                            //     connected = true;
                                setWs(ws);
                                setAuthLevel(authLevel);
                            // }
                        }
                        else {
                            // incorrect authorization, bug
                        }
                    }
                    else {
                        // authorization denied, show error?
                    }
                });
            });
    
            return () => { ws.close(); };
        }
    }, [classroom]);

    return useMemo(() => wsInstance ? {
        ws: wsInstance,
        authLevel,
        getParticipants() {
            return new Promise((resolve, reject) => {
                if (wsInstance) {
                    wsInstance.emit('getParticipants', resolve);
                }
                else {
                    // ws is not yet established
                    reject();
                }
            });
        }
    } as Omit<ClientToServerOrders, 'getParticipants'> & {
        ws: typeof wsInstance,
        authLevel: AuthLevel,
        getParticipants(): Promise<Username[]>
    } : undefined, [
        authLevel,
        wsInstance
    ]);
}

export function useRTC<T>(classroom: string, onPeer: (peer: Peer.Instance, info: T) => void) {
    const socketInfo = useSignalingWebsocket(classroom);

    const onPeerRef = useRef(onPeer);

    useEffect(() => {
        onPeerRef.current = onPeer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onPeer]);

    useEffect(() => {
        const ws = socketInfo?.ws ? tracked(socketInfo.ws) : undefined;
        
        if (ws) {
            let peers = [] as Peer.Instance[];

            ws.on('connect', () => {
                peers.forEach(p => p.destroy());
                peers = [];
            });

            ws.on('createWebRTCConnection', (initiator, connectionId, info) => {
                const peer = new Peer({
                    initiator,
                });
                peers.push(peer);
                let notifiedPeer = false;
                console.log('created peer', initiator, connectionId, info);
                
                const peerTrackedWs = tracked(ws);

                peer.on('error', err => console.log('peer error', err))
                
                peer.on('signal', data => {
                    // console.log('signal to peer', connectionId);
                    ws.emit('provideWebRTCSignal', connectionId, data);
                });
                peerTrackedWs.on('signalWebRTCConnection', (conn, signal) => {
                    if (conn === connectionId) {
                        console.log('recieved signal from peer', conn);
                        peer.signal(signal);
                        if (!notifiedPeer) {
                            notifiedPeer = true;
                            onPeerRef.current(peer, info);
                        }
                    }
                });

                peerTrackedWs.on('killWebRTCConnection', (conn) => {
                    if (conn === connectionId) {
                        console.log('killed connection', conn);
                        peer.destroy();
                    }
                });
                peer.on('close', () => peerTrackedWs.offTracked());
            });

            return () => ws.offTracked();
        }
    }, [socketInfo?.ws]);
    
    return socketInfo;
}