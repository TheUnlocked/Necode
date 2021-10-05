import { Nominal } from "./types";

declare const optionSymbol: unique symbol;
export type Option<T> = Nominal<{ exists: true, value: T } | { exists: false }, typeof optionSymbol>;

export function Some<T>(x: T) {
    return {
        exists: true,
        value: x
    } as Option<T>;
}

export const None = {
    exists: false
} as Option<any>;