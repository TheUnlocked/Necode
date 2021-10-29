import { Server, Socket } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';
import type EventEmitter from 'typed-emitter';

export type TrackingList = { [ev: string]: ((...args: any) => void)[] };

type Trackable = EventEmitter<any> | Socket<any, any, any> | ClientSocket<any, any> | Server<any, any, any>;

export type Tracked<E extends Trackable> = E & {
    offTrackedEvent(ev: Parameters<E['on']>[0]): void;
    offTracked(): void;
};

export default function tracked<E extends Trackable>(emitter: E): Tracked<E>;
export default function tracked<E extends Trackable>(emitter: E | undefined): Tracked<E> | undefined;
export default function tracked<E extends Trackable>(emitter: E | undefined) {
    if (!emitter) {
        return undefined;
    }

    const trackingList = {} as TrackingList;
    return new Proxy(emitter, {
        get(target: typeof emitter, field: string | symbol | number, reciever) {
            switch (field) {
                case nameof<EventEmitter<any>>(e => e.on):
                case nameof<EventEmitter<any>>(e => e.once):
                case nameof<EventEmitter<any>>(e => e.addListener):
                case nameof<EventEmitter<any>>(e => e.prependListener):
                case nameof<EventEmitter<any>>(e => e.prependOnceListener):
                    return (ev: any, listener: any) => {
                        (trackingList[ev] ??= []).push(listener);
                        return (target as any)[field](ev, listener);
                    };
                case nameof<Tracked<E>>(e => e.offTrackedEvent):
                    return (ev: any) => {
                        trackingList[ev].forEach(handler => emitter.off(ev, handler));
                    };
                case nameof<Tracked<E>>(e => e.offTracked):
                    return () => {
                        for (const ev in trackingList) {
                            trackingList[ev].forEach(handler => emitter.off(ev, handler));
                        }
                    };
                default:
                    return Reflect.get(target, field, reciever);
            }
        }
    }) as Tracked<E>;
}