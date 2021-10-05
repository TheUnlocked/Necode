import AutoRing from "../src/util/AutoRing";
import { Username } from "./types";

export class Classroom {
    users = new Set<string>();
    instructors = new Set<string>();

    activity?: Activity;

    constructor(public name: string) {}
}

export interface RingActivity {
    protocol: 'ring';
    ring: AutoRing<Username>;
}

export type Activity = RingActivity;