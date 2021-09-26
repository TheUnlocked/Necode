import type { SignalData } from 'simple-peer';
import { Nominal } from '../src/util/types';

type Voidify<T> = T extends (...args: infer TArgs) => any ? (...args: TArgs) => void : T;
type VoidifyAll<T extends {}> = { [Key in keyof T]: Voidify<T[Key]> };

declare const usernameBrand: unique symbol;
/** Use `as` casts to transform between usernames and strings */
export type Username = Nominal<string, typeof usernameBrand>;


export interface ClientToServerOrders {
    getParticipants(): Promise<Username[]>;
    linkParticipants(initiator: Username, participants: Username[], initiatorInfo?: any, participantInfo?: any): void;
    unlinkParticipants(user: Username, connections: Username[]): void;
}

export interface ClientToServerEventMap extends VoidifyAll<ClientToServerOrders> {
    // Automatic Orders
    join(jwt: string): void;

    // Replies
    provideWebRTCSignal(user: Username, signal: SignalData): void;
}

export interface ServerToClientEventMap {
    // Orders
    createWebRTCConnection(initiator: boolean, withUser: Username, info: any): void;
    signalWebRTCConnection(user: Username, signal: SignalData): void;
    killWebRTCConnection(withUser: Username): void;

    // Replies
    grantAuthorization(authority: AuthLevel, user: Username, classroom: string): void;
    provideParticipants(participants: Username[]): void;

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
    linkParticipants: AuthLevel.Instructor,
    unlinkParticipants: AuthLevel.Instructor,
    provideWebRTCSignal: AuthLevel.Joined
} as {[ eventName in keyof ClientToServerEventMap ]: AuthLevel};