export type Message<EventMap extends {}, Event extends keyof EventMap = keyof EventMap> = EventMap[Event] extends never ? {
    type: Event;
} : {
    type: Event;
    body: EventMap[Event];
}

export interface MainToIFrameEventMap {
    ping: never;
    /** Confirm Handshake */
    identity: number;
    changeCode: string;
}

export type MainToIframeMessage<Event extends keyof MainToIFrameEventMap = keyof MainToIFrameEventMap>
    = Message<MainToIFrameEventMap, Event>;

export interface IframeToMainEventMap {
    pong: never;
    /** Initiate Handshake */
    ready: never;
    /** Complete Handshake */
    identityAck: never;
    changeCodeAck: never;
}

export type IframeToMainMessage<Event extends keyof IframeToMainEventMap = keyof IframeToMainEventMap>
    = Message<IframeToMainEventMap, Event> & { origin: number };

export type AnyMessage = MainToIframeMessage | IframeToMainMessage;