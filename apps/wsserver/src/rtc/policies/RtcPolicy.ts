import { NetworkId, PolicyParams } from '~api/RtcNetwork';
import { SignalData } from '~api/ws';
import RtcManager from "../RtcManager";

export interface ConnectionInfo {
    connectionId: string;
    alive: boolean;
    destroyWebRtcConnection: () => void;
}

export interface RtcPolicySettings {
    rtc: RtcManager;
    params: PolicyParams;
}

export interface RtcCoordinatorFactory {
    new(network: NetworkId, users: Iterable<string>, settings: RtcPolicySettings): RtcCoordinator;
    readonly policyId: string;
    validate(params?: PolicyParams): Promise<boolean>;
}

export interface RtcCoordinator {
    onUserJoin(user: string): void;
    /**
     * Must be a no-op if the user is not already connected
     * @param user 
     */
    onUserLeave(user: string): void;
    signal(user: string, event: string, info: SignalData): void;

    hasUser(user: string): boolean;
    
    getState(): string;
    loadState(state: string): void;
}
