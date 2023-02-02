import type { SignalData } from 'simple-peer';
import { Server } from 'socket.io';
import { ActivitySubmissionEntity } from './entities/ActivitySubmissionEntity';
import { NetworkId, PolicyConfiguration } from './RtcNetwork';

export type IOServer = Server<ClientToServerEventMap, ServerToClientEventMap>;

export interface ClientToServerEventMap {
    join(jwt: string, callback: (ok: boolean) => void): void;
    joinRtc(): void;
    
    getParticipants(callback: (participants: string[]) => void): void;
    getActivity(callback: (liveActivityInfo: CreateLiveActivityInfo) => void): void;
    
    /**
     * Send a command as an instructor to other users in the class.
     * This should be used for transient interaction (e.g. a live chat message).
     * Data which should be preserved between reloads should NOT use command
     * and should instead use either the Submission or LiveActivity API.
     * @param to a specific set of users to broadcast the command to.
     *      If undefined, it will broadcast to everyone in the classroom,
     *      EXCLUDING your current session, but possibly including
     *      other sessions from the same account.
     * @param data the data to send in the command
     */
    command(to: string[] | undefined, data: any, callback: (error?: string) => void): void;
    /**
     * Send a request as a user to the instructor(s) in the class.
     * This should be used for transient interaction (e.g. a live chat message).
     * Data which should be preserved between reloads should NOT use command
     * and should instead use the Submission API.
     * If you are an instructor, you will be sent your own request.
     * @param data the data to send in the request
     */
    request(data: any, callback: (error?: string) => void): void;
    submission(submission: { schemaVer: number, data: any }, callback: (error?: string) => void): void;

    provideWebRTCSignal(connId: string, signal: SignalData): void;
}

export interface ServerToClientEventMap {
    // Orders
    createWebRTCConnection(network: NetworkId, initiator: boolean, connId: string, info: {
        /** A name to display for the connected user */
        displayName: string;
    }): void;
    signalWebRTCConnection(connId: string, signal: SignalData): void;
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
    command(data: any): void;
    request(data: any): void;
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
