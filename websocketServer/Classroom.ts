import AutoRing from "../src/util/AutoRing";
import { IProtocol } from "./rtc/protocols/IProtocol";
import { Username } from "./types";

export class Classroom {
    users = new Set<string>();
    instructors = new Set<string>();

    activity?: Activity;

    constructor(public name: string) {}
}

export interface Activity {
    protocol: IProtocol;
}