import { omit } from 'lodash';
import { createContext, PropsWithChildren, useCallback, useEffect, useRef, useState, useContext } from 'react';
import SimplePeer from 'simple-peer';
import { NetworkId } from '../api/RtcNetwork';
import cyrb53 from '../util/cyrb53';
import { callWith } from '../util/fp';
import tracked from '../util/trackedEventEmitter';
import { SocketInfo } from './useSocket';

/**
 * Information about a remote user.
 */
export interface RemoteUserInfo {
    /** An ID representing the connection. This is randomly generated and is not associated with the user's permanent ID */
    id: string;
    /** The display name of the user on the other side of the connection. */
    displayName: string;
}

interface Peer extends SimplePeer.Instance, RemoteUserInfo {
    isInitiator: boolean;
}

export type UsePeerCallback = (peer: Peer) => void | (() => void);

type RtcContextValue = (network: NetworkId) => {
    callbacks: Set<UsePeerCallback>,
    peers: Set<Peer>,
};

const RtcContext = createContext<RtcContextValue | undefined>(undefined);

export function RtcProvider({ socketInfo, children }: PropsWithChildren<{ socketInfo: SocketInfo }>) {
    const onPeerCallbacksRef = useRef(new Map<NetworkId, Set<UsePeerCallback>>());
    const peersRef = useRef(new Set<Peer>());

    const getNetworkCallbacksRef = useRef((network: NetworkId) => {
        let networkCallbacks = onPeerCallbacksRef.current.get(network);
        if (!networkCallbacks) {
            networkCallbacks = new Set();
            onPeerCallbacksRef.current.set(network, networkCallbacks);
        }
        return {
            callbacks: networkCallbacks,
            peers: peersRef.current,
        };
    });

    useEffect(() => {
        if (!socketInfo) {
            return;
        }

        const ws = tracked(socketInfo.socket);

        function createPeerConnection(network: NetworkId, initiator: boolean, connectionId: string, info: { displayName: string } = { displayName: 'unknown' }) {
            const peer = new SimplePeer({
                initiator,
                config: {
                    iceServers: socketInfo.iceServers,
                },
            }) as Peer;
            peer.id = connectionId;
            peer.displayName = info.displayName;
            peer.isInitiator = initiator;

            const cleanupCallbacks = [] as (() => void)[];

            peersRef.current.add(peer);

            console.debug('created peer', initiator, connectionId, info);
            
            const peerTrackedWs = tracked(socketInfo.socket);

            peer.on('error', err => console.error('peer error', err));
            
            peer.on('signal', data => {
                console.debug('signal to peer', connectionId);
                ws.emit('provideWebRTCSignal', connectionId, data);
            });
            peerTrackedWs.on('signalWebRTCConnection', (conn, signal) => {
                if (conn === connectionId) {
                    console.debug('recieved signal from peer', conn);
                    peer.signal(signal);
                }
            });

            let intentionallyClosed = false;

            peerTrackedWs.on('killWebRTCConnection', (conn) => {
                if (conn === connectionId) {
                    console.debug('killed connection', conn);
                    intentionallyClosed = true;
                    peer.destroy();
                }
            });
            peer.on('close', () => {
                console.debug('closed', connectionId);
                peerTrackedWs.offTracked();
                cleanupCallbacks.forEach(callWith());
                peersRef.current.delete(peer);
                if (!intentionallyClosed) {
                    console.debug('attempting to revive', connectionId);
                    createPeerConnection(network, initiator, connectionId, info);
                }
            });

            peer.once('connect', () => {
                console.debug('connected', connectionId);
            });

            cleanupCallbacks.push(...[...getNetworkCallbacksRef.current(network).callbacks].map(cb => cb(peer) ?? (() => {})));
        }

        ws.on('createWebRTCConnection', createPeerConnection);

        if (ws.connected) {
            ws.emit('joinRtc');
        }

        ws.on('connect', () => ws.emit('joinRtc'));

        return () => {
            ws.offTracked();
        };
    }, [socketInfo]);

    // Cleanup peers when leaving
    useEffect(() => {
        return () => {
            // eslint-disable-next-line @grncdr/react-hooks/exhaustive-deps
            for (const peer of peersRef.current) {
                if (!peer.destroyed) {
                    peer.destroy();
                }
            }
        };
    }, []);

    return <RtcContext.Provider value={getNetworkCallbacksRef.current}>{children}</RtcContext.Provider>;
}

function usePeer(network: NetworkId, callback: UsePeerCallback) {
    const rtcData = useContext(RtcContext)?.(network);

    useEffect(() => {
        if (rtcData) {
            rtcData.peers.forEach(callback);
        }
    // Fire onPeer callback for each peer on initial load
    // eslint-disable-next-line @grncdr/react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!rtcData) {
            return;
        }
        if (rtcData.callbacks.has(callback)) {
            console.error('Cannot use the same listener for multiple instances of usePeer.');
            return;
        }
        rtcData.callbacks.add(callback);
        return () => { rtcData.callbacks.delete(callback) };
    }, [rtcData, callback]);
}

export const usePeer_unstable = usePeer;

function encode(id: bigint, data: Uint8Array) {
    const buffer = new Uint8Array(data.length + 8);
    const view = new DataView(buffer.buffer);
    view.setBigUint64(0, id);
    buffer.set(data, 8);
    return buffer;
}

function decode(id: bigint, data: Uint8Array) {
    const messageChannelId = new DataView(data.buffer).getBigUint64(0);
    if (messageChannelId === id) {
        return data.slice(8);
    }
    else {
        console.debug(`recv message id ${messageChannelId} !== ${id}`);
    }
}

function encodeString(id: bigint, str: string) {
    console.debug(`encoding ${str} on channel ${id}`);
    return encode(id, new TextEncoder().encode(str));
}

function decodeString(id: bigint, data: Uint8Array) {
    const buffer = decode(id, data);
    if (buffer) {
        return new TextDecoder().decode(buffer);
    }
}

export type DataChannelEmit<T> = (data: T, options?: {
    /**
     * A list of peer IDs to send the message to, or `'broadcast'` to send it to all peers.
     * @default 'broadcast'
     */
    target?: 'broadcast' | string[]
}) => void;

function useEmitFunction(channelId: bigint, getPeers: () => Iterable<Peer>): DataChannelEmit<Uint8Array> {
    return useCallback((data, { target = 'broadcast' } = { }) => {
        const encoded = encode(channelId, data);
        for (const peer of target === 'broadcast' ? getPeers() : [...getPeers()].filter(x => target.includes(x.id))) {
            if (peer.connected) {
                peer.send(encoded);
            }
            else if (!peer.destroyed) {
                peer.once('connect', () => peer.send(encoded));
            }
        }
    }, [channelId, getPeers]);
}

type DataChannelLifecycle<T> = (
    ...args: [
        event: 'connect',
        data: {
            /** Information about the user who connected */
            who: RemoteUserInfo,
        },
        emit: DataChannelEmit<T>,
    ]
    | [
        event: 'message',
        data: {
            /** The data that was sent */
            content: T,
            /** Information about the user who sent the message */
            from: RemoteUserInfo,
        },
        emit: DataChannelEmit<T>,
    ]
    | [
        event: 'disconnect',
        data: {
            /** Information about the user who disconnected */
            who: RemoteUserInfo,
        },
        emit?: undefined,
    ]
) => void;

export function useDataChannelLifecycle(
    network: NetworkId,
    channelName: string,
    handler: DataChannelLifecycle<Uint8Array>
): DataChannelEmit<Uint8Array> {
    const channelId = cyrb53(channelName);

    const emit = useEmitFunction(channelId, useCallback(() => peersRef.current, []));

    const peersRef = useRef(new Set<Peer>());

    const recvHandler = useCallback((peer: Peer, data: Uint8Array) => {
        const decoded = decode(channelId, data);
        if (decoded) {
            handler('message', { content: decoded, from: peer }, emit);
        }
    }, [channelId, handler, emit]);

    const peerRecvHandlerMap = useRef(new Map<Peer, (data: Uint8Array) => void>);

    useEffect(() => {
        for (const peer of peersRef.current) {
            peer.off('data', peerRecvHandlerMap.current.get(peer)!);

            const myRecvHandler = (data: Uint8Array) => recvHandler(peer, data);
            peer.on('data', myRecvHandler);
            peerRecvHandlerMap.current.set(peer, myRecvHandler);
        }
    }, [recvHandler]);

    const disconnectHandlerRef = useRef<(peer: Peer) => void>(null!);
    disconnectHandlerRef.current = peer => {
        handler('disconnect', { who: peer });
    };

    usePeer(network, useCallback(peer => {
        peersRef.current.add(peer);

        const myRecvHandler = (data: Uint8Array) => recvHandler(peer, data);
        peer.on('data', myRecvHandler);
        peerRecvHandlerMap.current.set(peer, myRecvHandler);

        handler('connect', { who: peer }, emit);
        return () => {
            peer.off('data', peerRecvHandlerMap.current.get(peer)!);
            peerRecvHandlerMap.current.delete(peer);
            
            peersRef.current.delete(peer);
            disconnectHandlerRef.current(peer);
        };
    }, [handler, emit, recvHandler]));

    return emit;
}

export function useDataChannel(
    network: NetworkId,
    channelName: string,
    onData: (
        /**
         * The data received
         */
        data: Uint8Array,
        /**
         * The peer that the data was sent by
         */
        from: RemoteUserInfo
    ) => void,
): DataChannelEmit<Uint8Array> {
    return useDataChannelLifecycle(network, channelName, useCallback((...[event, data]) => {
        if (event === 'message') {
            onData(data.content, data.from);
        }
    }, [onData]));
};

function convertEmitBytesToEmitString(emitBytes: DataChannelEmit<Uint8Array>): DataChannelEmit<string> {
    return (data, options) => emitBytes(new TextEncoder().encode(data), options);
}

export function useStringDataChannelLifecycle(
    network: NetworkId,
    channelName: string,
    handler: DataChannelLifecycle<string>
): DataChannelEmit<string> {
    const emitBytes = useDataChannelLifecycle(network, channelName, useCallback((...[event, data, emit]) => {
        switch (event) {
            case 'connect':
                return handler('connect', data, convertEmitBytesToEmitString(emit));
            case 'message':
                return handler('message', { content: new TextDecoder().decode(data.content), from: data.from }, convertEmitBytesToEmitString(emit));
            case 'disconnect':
                return handler(event, data);
        }
    }, [handler]));

    return convertEmitBytesToEmitString(emitBytes);
}

export function useStringDataChannel(
    network: NetworkId,
    channelName: string,
    onData: (
        /**
         * The data received
         */
        data: string,
        /**
         * The peer that the data was sent by
         */
        from: RemoteUserInfo
    ) => void,
): DataChannelEmit<string> {
    return useStringDataChannelLifecycle(network, channelName, useCallback((...[event, data]) => {
        if (event === 'message') {
            onData(data.content, data.from);
        }
    }, [onData]));
};

export function useMediaChannel(
    network: NetworkId,
    channelName: string,
): readonly [readonly MediaStream[], (stream: MediaStream | undefined) => void] {
    const channelId = cyrb53(channelName);

    const peerIdIncRef = useRef(0);
    const [incomingStreams, setIncomingStreams] = useState<{ [peerId: number]: MediaStream }>({});

    const peersRef = useRef(new Set<Peer>());

    const outgoingStreamRef = useRef<MediaStream | undefined>();

    usePeer(network, useCallback(peer => {
        peersRef.current.add(peer);
        const peerId = peerIdIncRef.current++;

        const streamMap = new Map<string, MediaStream>();
        const streamHandler = (stream: MediaStream) => {
            console.debug('stream arrived', stream.id);
            streamMap.set(stream.id, stream);
        };
        const dataHandler = (data: Uint8Array) => {
            if (peer.isInitiator) {
                return;
            }
            const streamId = decodeString(channelId, data);
            if (streamId) {
                const stream = streamMap.get(streamId);
                if (stream) {
                    console.debug('Stream had already arrived');
                    setIncomingStreams(streams => ({ ...streams, [peerId]: stream }));
                }
                else {
                    // If the stream arrives after the message about it, we'll just poll for a bit until it either arrives or times out
                    console.debug('Stream arrived after message');
                    (async () => {
                        for (let i = 0; i < 20; i++) {
                            await new Promise(resolve => setTimeout(resolve, 200));
                            console.debug('Polling to see if message arrived...');
                            const stream = streamMap.get(streamId);
                            if (stream) {
                                console.debug('Recieved stream from peer', peerId);
                                setIncomingStreams(streams => ({ ...streams, [peerId]: stream }));
                                return;
                            }
                        }
                        console.debug('Message about stream timed out.');
                    })();
                }
            }
            else {
                console.debug('cleared incoming stream');
                setIncomingStreams(streams => omit(streams, peerId));
            }
        };

        function handleConnect() {
            if (outgoingStreamRef.current && peer.isInitiator) {
                const encoded = encodeString(channelId, outgoingStreamRef.current?.id ?? '');
                peer.addStream(outgoingStreamRef.current);
                peer.send(encoded);
                console.debug('sent!');
            }
        }

        peer.on('stream', streamHandler);
        peer.on('data', dataHandler);

        if (peer.connected) {
            handleConnect();
        }
        else {
            peer.on('connect', handleConnect);
        }

        console.debug('established peer', peerId);

        return () => {
            console.debug('disconnected from peer', peerId);
            peer.off('stream', streamHandler);
            peer.off('data', dataHandler);
            peersRef.current.delete(peer);
            setIncomingStreams(streams => omit(streams, peerId));
        };
    }, [channelId]));

    const currentStreamRef = useRef<MediaStream>();

    console.debug(channelId, Object.values(incomingStreams));
    return [
        Object.values(incomingStreams),
        useCallback(stream => {
            outgoingStreamRef.current = stream;
            const encoded = encodeString(channelId, stream?.id ?? '');
            for (const peer of peersRef.current) {
                if (!peer.isInitiator) {
                    return;
                }
                if (currentStreamRef.current) {
                    if (peer.streams.includes(currentStreamRef.current)) {
                        peer.removeStream(currentStreamRef.current);
                    }
                }
                if (peer.connected) {
                    if (stream) {
                        peer.addStream(stream);
                    }
                    peer.send(encoded);
                    console.debug('sent!');
                }
            }
            currentStreamRef.current = stream;
        }, [channelId]),
    ];
};
