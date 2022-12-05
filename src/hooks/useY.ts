import { useCallback, useEffect, useMemo } from 'react';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import * as Y from 'yjs';
import { NetworkId } from '../api/RtcNetwork';
import { useDataChannel } from './useRtc';


export default function useY(network: NetworkId, channel: string) {
    const ydoc = useMemo(() => new Y.Doc(), []);

    const emit = useDataChannel(
        network,
        channel,
        // On Data Received
        useCallback(update => {
            Y.applyUpdateV2(ydoc, update);
        }, [ydoc]),
        // On Created
        useCallback((emit: (data: Uint8Array) => void) => {
            console.debug('Sending initial Y state');
            emit(Y.encodeStateAsUpdateV2(ydoc));
        }, [ydoc]),
    );

    useEffect(() => {
        const handler = (update: Uint8Array) => {
            emit(Y.convertUpdateFormatV1ToV2(update));
        };
        ydoc.on('update', handler);
        return () => ydoc.off('update', handler);
    }, [ydoc, emit]);

    return ydoc;
}

export function useYAwareness(network: NetworkId, channel: string, doc: Y.Doc) {
    const awareness = useMemo(() => new Awareness(doc), [doc]);
    
    const emit = useDataChannel(
        network,
        channel,
        useCallback(update => {
            applyAwarenessUpdate(awareness, update, null);
        }, [awareness])
    );

    useEffect(() => {
        const handler = () => {
            emit(encodeAwarenessUpdate(awareness, Array.from(awareness.getStates().keys())));
        };
        awareness.on('change', handler);
        return () => awareness.off('change', handler);
    }, [awareness, emit]);

    return awareness;
}