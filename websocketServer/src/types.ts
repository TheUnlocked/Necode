import type { SignalData } from 'simple-peer';
import { Server } from 'socket.io';
import { ActivitySubmissionEntity } from '../../src/api/entities/ActivitySubmissionEntity';

export type IOServer = Server<ClientToServerEventMap, ServerToClientEventMap>;

export interface ClientToServerEventMap {
    join(jwt: string, callback: (ok: boolean) => void): void;
    
    getParticipants(callback: (participants: string[]) => void): void;
    getActivity(callback: (liveActivityinfo: LiveActivityInfo) => void): void;
    
    /**
     * Send a command as an instructor to other users in the class.
     * This should be used for transient interaction (e.g. a live chat message).
     * Data which should be preserved between reloads should NOT use command
     * and should instead use either the Submission or LiveActivity API.
     * @param to a specific set of users, or undefined to broadcast it to everyone
     * @param data the data to send in the command
     */
    command(to: string[] | undefined, data: any): void;
    /**
     * Send a request as a user to the instructor(s) in the class.
     * This should be used for transient interaction (e.g. a live chat message).
     * Data which should be preserved between reloads should NOT use command
     * and should instead use the Submission API.
     * @param data the data to send in the request
     */
    request(data: any): void;
    submit(data: any): void;

    provideWebRTCSignal(connId: string, signal: SignalData): void;
}

export interface ServerToClientEventMap {
    // Orders
    createWebRTCConnection(initiator: boolean, connId: string, info: any): void;
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
    startActivity(liveActivityinfo: LiveActivityInfo): void;
    endActivity(): void;
    command(data: any): void;
    request(data: any): void;
    submission(entity: ActivitySubmissionEntity): void;
}

export interface LiveActivityInfo {
    id: string;
    info: any;
}
