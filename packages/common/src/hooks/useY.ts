import { useCallback, useEffect, useMemo } from 'react';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import * as Y from 'yjs';
import { NetworkId } from 'api/RtcNetwork';
import { useDataChannel, useDataChannelLifecycle } from './RtcHooks';


export default function useY(network: NetworkId, channel: string) {
    const yDoc = useMemo(() => new Y.Doc(), []);

    const emit = useDataChannelLifecycle(
        network,
        channel,
        // On Data Received
        useCallback((...[event, data, emit]) => {
            switch (event) {
                case 'connect':
                    console.debug('Sending initial Y state to', data.who.id);
                    emit(Y.encodeStateAsUpdateV2(yDoc), { target: [data.who.id] });
                    break;
                case 'message':
                    Y.applyUpdateV2(yDoc, data.content);
            }
        }, [yDoc]),
    );

    useEffect(() => {
        const handler = (update: Uint8Array) => {
            emit(Y.convertUpdateFormatV1ToV2(update));
        };
        yDoc.on('update', handler);
        return () => yDoc.off('update', handler);
    }, [yDoc, emit]);

    return yDoc;
}

/**
 * Returns a Y awareness instance. See https://github.com/yjs/y-protocols for details.
 */
export function useYAwareness(network: NetworkId, channel: string, doc: Y.Doc, extraFields: Record<string, any> = {}) {
    const awareness = useMemo(() => new Awareness(doc), [doc]);
    
    const emit = useDataChannel(
        network,
        channel,
        useCallback((update) => {
            applyAwarenessUpdate(awareness, update, null);
        }, [awareness])
    );

    useEffect(() => {
        const handler = () => {
            awareness.setLocalState({ ...extraFields, ...awareness.getLocalState() });
            emit(encodeAwarenessUpdate(awareness, Array.from(awareness.getStates().keys())));
        };
        awareness.on('change', handler);
        return () => awareness.off('change', handler);
    }, [awareness, emit, extraFields]);

    return awareness;
}