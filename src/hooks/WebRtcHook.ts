import { useEffect, useRef } from 'react';
import Peer from 'simple-peer';
import tracked from '../util/trackedEventEmitter';
import { SocketInfo } from './SocketHook';


export function useRTC<T>(socketInfo: SocketInfo | undefined, onPeer: (peer: Peer.Instance, info: T) => void) {
    const onPeerRef = useRef(onPeer);

    useEffect(() => {
        onPeerRef.current = onPeer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onPeer]);

    useEffect(() => {
        if (!socketInfo?.socket) {
            return;
        }

        const ws = socketInfo?.socket ? tracked(socketInfo.socket) : undefined;
        
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
    }, [socketInfo?.socket]);
    
    return socketInfo;
}