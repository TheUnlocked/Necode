import { useEffect, useRef } from 'react';
import Peer from 'simple-peer';
import tracked from '../util/trackedEventEmitter';
import { SocketInfo } from './useSocket';


export function useRTC<T>(socketInfo: SocketInfo | undefined, onPeer: (peer: Peer.Instance, info: T) => void) {
    const onPeerRef = useRef(onPeer);

    useEffect(() => {
        onPeerRef.current = onPeer;
    }, [onPeer]);

    useEffect(() => {
        if (!socketInfo) {
            return;
        }

        const ws = tracked(socketInfo.socket);
        
        let peers = [] as Peer.Instance[];

        ws.on('connect', () => {
            peers.forEach(p => p.destroy());
            peers = [];
        });
        
        ws.on('createWebRTCConnection', (initiator, connectionId, info) => {
            const peer = new Peer({
                initiator,
                config: {
                    iceServers: socketInfo.iceServers,
                },
            });
            peers.push(peer);
            console.log('created peer', initiator, connectionId, info);
            
            onPeerRef.current(peer, info);
            
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

        ws.emit('joinRtc');

        return () => {
            peers.forEach(x => x.destroy());
            ws.offTracked();
        };
    }, [socketInfo]);
}