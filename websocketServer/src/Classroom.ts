import { IProtocol } from "./rtc/protocols/IProtocol";

export class Classroom {
    users = new Set<string>();
    instructors = new Set<string>();

    activity?: Activity;

    constructor(public name: string) {}
}

export interface Activity {
    protocol: IProtocol;
}