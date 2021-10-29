import { Username } from "../../types";
import RtcManager from "../RtcManager";

export interface ConnectionInfo {
    connectionId: string;
    alive: boolean;
    destroyWebRtcConnection: () => void;
}

export interface IProtocolSettings {
    rtc: RtcManager;
}

export interface IProtocolConstructor {
    new(users: Username[], settings: IProtocolSettings): IProtocol;
}

export interface IProtocol {
    readonly protocolId: string;
    onUserJoin(user: Username): void;
    onUserLeave(user: Username): void;
}

/** Static typing decorator since TS doesn't have a syntax for implementing a static member interface  */
export function protocol<U extends IProtocolConstructor>(_: U) {}