import type { SignalData as PeerSignalData } from 'simple-peer';
import { Server } from 'socket.io';
import { ActivitySubmissionEntity } from './entities/ActivitySubmissionEntity';
import { NetworkId, PolicyConfiguration } from './RtcNetwork';

export type IOServer = Server<ClientToServerEventMap, ServerToClientEventMap>;

export type SignalData = { [key in string]: number | string | boolean };

export interface ClientToServerEventMap {
    join(jwt: string, callback: (ok: boolean) => void): void;
    joinRtc(): void;
    signal(network: NetworkId, event: string, data: SignalData, callback: (error?: string) => void): void;
    
    getParticipants(callback: (participants: string[]) => void): void;
    getActivity(callback: (liveActivityInfo: CreateLiveActivityInfo) => void): void;
    

    submission(submission: { schemaVer: number, data: any }, callback: (error?: string) => void): void;

    provideWebRTCSignal(connId: string, signal: PeerSignalData): void;
}

export interface ServerToClientEventMap {
    // Orders
    createWebRTCConnection(network: NetworkId, initiator: boolean, connId: string, info: {
        /** A name to display for the connected user */
        displayName: string;
    }): void;
    signalWebRTCConnection(connId: string, signal: PeerSignalData): void;
    killWebRTCConnection(connId: string): void;

    // Events
    userJoin(name: string): void;
    userLeave(name: string): void;

    /**
     * Send when an activity starts or changes.
     * Recieving this does NOT imply that the activity should restart.
     * An activity restart would be indicated by recieving
     * an endActivity event followed by a startActivity event.
     */
    startActivity(liveActivityinfo: SignalLiveActivityInfo): void;
    endActivity(): void;
    submission(entity: ActivitySubmissionEntity<{ user: 'deep', activity: 'none' }>): void;
}

export interface CreateLiveActivityInfo {
    id: string;
    networks: readonly PolicyConfiguration[];
    info?: any;
}

export interface SignalLiveActivityInfo {
    id: string;
    info?: any;
}
