import { MutableRefObject } from "react";

const CHANNEL_PROP_NAME = '__channel__';
const ID_PROP_NAME = '__id__';

export function orderedMessagePatcher(channel: string) {
    let id = 0;
    return function (message: any) {
        return {
            ...message,
            [CHANNEL_PROP_NAME]: channel,
            [ID_PROP_NAME]: id++
        };
    }
}

export function orderedListener<TEvent extends MessageEvent, TArgs extends []>(
    listener: (ev: TEvent, ...rest: TArgs) => void,
    channel: string,
    ref: MutableRefObject<number | null> = { current: null }
) {
    const buffer = new Map<number, [TEvent, ...TArgs]>();
    return function (ev: TEvent, ...rest: TArgs) {
        if (ev.data[CHANNEL_PROP_NAME] === channel) {
            if (ref.current == null) {
                ref.current = ev.data[ID_PROP_NAME] as number;
            }
            if (ev.data[ID_PROP_NAME] === ref.current) {
                listener(ev, ...rest);
                while (buffer.has(++ref.current)) {
                    listener(...buffer.get(ref.current) as [TEvent, ...TArgs]);
                    buffer.delete(ref.current);
                }
            }
            else {
                buffer.set(ev.data[ID_PROP_NAME], [ev, ...rest]);
            }
        }
        else {
            listener(ev, ...rest);
        }
    }
}
