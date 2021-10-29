import type { SignalData } from 'simple-peer';
import { Server } from 'socket.io';
import { NewType } from '../../src/util/types';

export type IOServer = Server<ClientToServerEventMap, ServerToClientEventMap>;

type Voidify<T> = T extends (...args: infer TArgs) => any ? (...args: TArgs) => void : T;
type VoidifyAll<T extends {}> = { [Key in keyof T]: Voidify<T[Key]> };

declare const usernameBrand: unique symbol;
/** Use `as` casts to transform between usernames and strings */
export type Username = NewType<string, typeof usernameBrand>;


export interface ClientToServerOrders {
    getParticipants(callback: (participants: Username[]) => void): Promise<Username[]>;
}

export interface ClientToServerEventMap extends VoidifyAll<ClientToServerOrders> {
    join(jwt: string, callback: (data: { authority: AuthLevel.Denied } | { authority: AuthLevel, user: Username, classroom: string }) => void): void;
    provideWebRTCSignal(connId: string, signal: SignalData): void;
}

export interface ServerToClientEventMap {
    // Orders
    createWebRTCConnection(initiator: boolean, connId: string, info: any): void;
    signalWebRTCConnection(connId: string, signal: SignalData): void;
    killWebRTCConnection(connId: string): void;

    // Events
    userJoin(name: Username): void;
    userLeave(name: Username): void;
}

export enum AuthLevel {
    /**
     * No user should ever have `AuthLevel.Denied`.
     * It is only used as the response provided when an authorization JWT is denied.
     */
    Denied = -1,
    None = 0,
    Joined = 1,
    Instructor = 10,
};

export const eventAuthorization = {
    join: AuthLevel.None,
    getParticipants: AuthLevel.Instructor,
    linkRtc: AuthLevel.Instructor,
    unlinkRtc: AuthLevel.Instructor,
    provideWebRTCSignal: AuthLevel.Joined
} as {[ eventName in keyof ClientToServerEventMap ]: AuthLevel};
