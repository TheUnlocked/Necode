import { DependencyList, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { AuthLevel, ClientToServerEventMap, ClientToServerOrders, ServerToClientEventMap, Username } from '../../websocketServer/types';
import Peer from 'simple-peer';
import tracked, { TrackingList } from '../util/trackedEventEmitter';

export function useSignalingWebsocket(classroom: string) {
    const [wsInstance, setWs] = useState<Socket<ServerToClientEventMap, ClientToServerEventMap> | undefined>();
    const [authLevel, setAuthLevel] = useState(AuthLevel.None);

    // dev
    let usernameRef = useRef("" as Username);

    useEffect(() => {
        if (classroom) {
            const ws = io(`${window.location.hostname}:3001`, { port: '3001' }) as Socket<ServerToClientEventMap, ClientToServerEventMap>;
            // let connected = false;
    
            ws.onAny(console.log);
    
            ws.on('connect', async () => {
                const jwt = await (await fetch(`/api/classroom/${classroom}/jwt`, { method: 'POST' })).text();
                ws.once('grantAuthorization', (authLevel, forUsername, inClassroom) => {
                    if (authLevel !== AuthLevel.Denied) {
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
                ws.emit('join', jwt);
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
                    wsInstance.once('provideParticipants', resolve);
                    wsInstance.emit('getParticipants');
                }
                else {
                    // ws is not yet established
                    reject();
                }
            });
        },
        linkParticipants(initiator, participants, initiatorInfo, participantInfo) {
            console.log('link', initiator, 'with', participants.join(','));
            wsInstance.emit('linkParticipants', initiator, participants, initiatorInfo, participantInfo);
        },
        unlinkParticipants(user, connections) {
            console.log('unlink', user, 'with', connections.join(','));
            wsInstance.emit('unlinkParticipants', user, connections);
        }
    } as ClientToServerOrders & { ws: typeof wsInstance, authLevel: AuthLevel } : undefined, [
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
            ws.on('createWebRTCConnection', (initiator, peerUsername, info) => {
                const peer = new Peer({
                    initiator
                });
                let notifiedPeer = false;
                console.log('created peer');
                
                const peerTrackedWs = tracked(ws);

                peer.on('error', err => console.log('peer error', err))
                
                peer.on('signal', data => {
                    console.log('signal to peer', peerUsername);
                    ws.emit('provideWebRTCSignal', peerUsername, data);
                });
                peerTrackedWs.on('signalWebRTCConnection', (user, signal) => {
                    if (user === peerUsername) {
                        peer.signal(signal);
                        if (!notifiedPeer) {
                            notifiedPeer = true;
                            onPeerRef.current(peer, info);
                        }
                    }
                });

                peerTrackedWs.on('killWebRTCConnection', withUser => {
                    if (withUser === peerUsername) {
                        peer.destroy();
                    }
                });
                peer.on('close', () => peerTrackedWs.offTracked());
            });

            return () => ws.offTracked();
        }
    }, [socketInfo]);
    
    return socketInfo;
}