import { DateTime } from "luxon";
import { Nominal } from "./types";

// Typescript doesn't like the proper format, so this'll have to do. 
export type Iso8601Date = Nominal<string, 'ISO-8601'>;

export const iso8601DateRegex = /^\d{4}-\d{2}-\d{2}$/;

export function fromLuxon(luxonDate: DateTime) {
    return luxonDate.toISODate({ format: 'extended' }) as Iso8601Date;
}

export function toLuxon(isoDate: Iso8601Date) {
    return DateTime.fromISO(isoDate);
}