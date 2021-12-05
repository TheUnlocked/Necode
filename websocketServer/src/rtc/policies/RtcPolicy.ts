import RtcManager from "../RtcManager";

export interface ConnectionInfo {
    connectionId: string;
    alive: boolean;
    destroyWebRtcConnection: () => void;
}

export interface RtcPolicySettings {
    rtc: RtcManager;
}

export interface RtcPolicyConstructor {
    new(users: Iterable<string>, settings: RtcPolicySettings): RtcPolicy;
    readonly policyId: string;
}

export interface RtcPolicy {
    onUserJoin(user: string): void;
    /**
     * Must be a no-op if the user is not already connected
     * @param user 
     */
    onUserLeave(user: string): void;
}

/** Static typing decorator since TS doesn't have a syntax for implementing a static member interface  */
export function rtcPolicy<U extends RtcPolicyConstructor>(_: U) {}