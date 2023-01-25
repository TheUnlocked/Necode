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
                case 'on':
                case 'once':
                case 'addListener':
                case 'prependListener':
                case 'prependOnceListener':
                    return (ev: any, listener: any) => {
                        (trackingList[ev] ??= []).push(listener);
                        return (target as any)[field](ev, listener);
                    };
                case 'offTrackedEvent':
                    return (ev: any) => {
                        trackingList[ev].forEach(handler => (emitter as EventEmitter<any>).off(ev, handler));
                    };
                case 'offTracked':
                    return () => {
                        for (const ev in trackingList) {
                            trackingList[ev].forEach(handler => (emitter as EventEmitter<any>).off(ev, handler));
                        }
                    };
                default:
                    return Reflect.get(target, field, reciever);
            }
        }
    }) as Tracked<E>;
}