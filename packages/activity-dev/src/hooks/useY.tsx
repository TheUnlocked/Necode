import { useCallback, useEffect, useMemo, useState } from 'react';
import { applyUnifiedUpdates } from '../utils/y-utils';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import * as Y from 'yjs';
import { NetworkId } from '~api/RtcNetwork';
import { useDataChannel, useDataChannelLifecycle } from '~shared-ui/hooks/RtcHooks';

export interface YHandle {
    readonly _doc: Y.Doc;
}

export interface UseYOptions {
    /**
     * A Yjs document to use in the Y handle.
     * If ommitted, a new document will be created any time the network or channel changes.
     */
    doc?: Y.Doc;
}

/**
 * Gets a Yjs handle which is linked on the specified network and channel.
 * The handle is stable for the lifetime of the network and channel. 
 */
export default function useY(network: NetworkId, channel: string, { doc: customDoc }: UseYOptions = {}): YHandle {
    const y = useMemo(() => ({
        _doc: customDoc ?? new Y.Doc(),
        _network: network,
        _channel: channel,
    }), [network, channel, customDoc]);

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

/**
 * Gets a Y text handle with a particular name from a Y handle.
 * The handle changes only when either the value, the name, or the Y handle changes.
 */
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
 * 
 * Unlike {@link useY} and {@link useYText}, this function does _not_ return a reactive handle.
 * Be careful when accessing its members directly.
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

/**
 * Perform an operation on the yjs document on initialization. This is useful for gracefully setting up initial or default values.
 * If you want to do such a thing after initialization, or cannot use a hook, use {@link applyUnifiedUpdates} instead. However, beware of desynchronization.
 * @param y 
 * @param callback This callback need not be stable (though it can be, if desired).
 */
export function useYInit(y: YHandle, callback: (yDoc: Y.Doc) => void) {
    useEffect(() => {
        applyUnifiedUpdates(y, callback);
    // We only want to update when y changes, even if the callback changes too.
    // eslint-disable-next-line @grncdr/react-hooks/exhaustive-deps
    }, [y]);
}
