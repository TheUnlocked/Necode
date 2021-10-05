import { Server } from 'socket.io';
import AutoRing from '../src/util/AutoRing';
import { ClientToServerEventMap, ServerToClientEventMap, Username } from './types';

export function createRing(io: Server<ClientToServerEventMap, ServerToClientEventMap>, { fromUsername }: {
    fromUsername: (id: Username) => string | undefined;
}) {
    const connIdMap = {} as  { [usernamePair: string]: string };

    const ring = new AutoRing<Username>([], {
        linkHandler(a, b) {
            console.log(a, '->', b);
            // @ts-ignore
            const events = io.sockets.sockets.get(fromUsername(a))?._events as Partial<ClientToServerEventMap>  | undefined;
            const connId = events?.linkRtc?.call?.(null, a, b, { 'role': 'send' }, { 'role': 'recv' }) as any as string;
            connIdMap[(a as string) + b] = connId;
        },
        unlinkHandler(a, b) {
            console.log(a, '-X', b);
            // @ts-ignore
            const events = io.sockets.sockets.get(fromUsername(a))?._events as Partial<ClientToServerEventMap> | undefined;
            events?.unlinkRtc?.call?.(null, connIdMap[(a as string) + b]);
            delete connIdMap[(a as string) + b];
        }
    });

    return ring;
}