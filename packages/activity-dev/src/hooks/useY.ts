import { useCallback, useEffect, useMemo, useState } from 'react';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import * as Y from 'yjs';
import { NetworkId } from '~api/RtcNetwork';
import { useDataChannel, useDataChannelLifecycle } from '~shared-ui/hooks/RtcHooks';


export interface YHandle {
    readonly _doc: Y.Doc;
}

export default function useY(network: NetworkId, channel: string): YHandle {
    const y = useMemo<YHandle>(() => ({ _doc: new Y.Doc() }), []);

    const emit = useDataChannelLifecycle(
        network,
        channel,
        // On Data Received
        useCallback((...[event, data, emit]) => {
            switch (event) {
                case 'connect':
                    console.debug('Sending initial Y state to', data.who.id);
                    emit(Y.encodeStateAsUpdateV2(y._doc), { target: [data.who.id] });
                    break;
                case 'message':
                    Y.applyUpdateV2(y._doc, data.content);
            }
        }, [y]),
    );

    useEffect(() => {
        const handler = (update: Uint8Array) => {
            emit(Y.convertUpdateFormatV1ToV2(update));
        };
        y._doc.on('update', handler);
        return () => {
            y._doc.off('update', handler);
        };
    }, [y, emit]);

    return y;
}

export interface YTextHandle {
    readonly _text: Y.Text;
    readonly value: string;
}

export function useYText(y: YHandle, name: string): YTextHandle {
    const text = useMemo(() => y._doc.getText(name), [y, name]);

    const [value, setValue] = useState(() => text.toString());

    useEffect(() => {
        const handler = () => {
            setValue(text.toString());
        };

        // If the text object changes, we'll need to update the value immediately
        setValue(text.toString());
        text.observe(handler);

        return () => text.unobserve(handler);
    }, [text]);

    return useMemo(() => ({ _text: text, value }), [text, value]);
}

/**
 * Returns a Y awareness instance. See https://github.com/yjs/y-protocols for details.
 */
export function useYAwareness(network: NetworkId, channel: string, y: YHandle, extraFields: Record<string, any> = {}) {
    const awareness = useMemo(() => new Awareness(y._doc), [y]);
    
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