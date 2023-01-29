import { MutableRefObject } from "react";

export type SimpleRef<T> = MutableRefObject<T> | ((value: T) => void);

export function assignRef<T>(ref: SimpleRef<T> | null | undefined, value: T) {
    if (ref) {
        if (typeof ref === 'function') {
            ref(value);
        }
        else {
            ref.current = value;
        }
    }
}