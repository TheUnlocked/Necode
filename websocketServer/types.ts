export interface ClientToServerEventMap {
    join: (jwt: string) => void;
    getParticipants: () => void;
    linkParticipants: (participants: { participantId: string, specialInstructions?: any }[]) => void;
}

export interface ServerToClientEventMap {
    authorization: (authority: AuthLevel) => void;
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
} as {[ eventName in keyof ClientToServerEventMap ]: AuthLevel};