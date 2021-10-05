import { Dispatch, SetStateAction, useCallback, useEffect, useState } from "react";

type NonUndefined<T> = T extends undefined ? never : T;

export function useMaybeControlled<TProps extends {}, TValueKey extends keyof TProps, TOnChangeKey extends Exclude<keyof TProps, TValueKey>, T extends TProps[TValueKey]>
    (props: TProps, key: TValueKey, changeEventKey: TOnChangeKey): [T, Dispatch<SetStateAction<T>>];
export function useMaybeControlled<TProps extends {}, TValueKey extends keyof TProps, TOnChangeKey extends Exclude<keyof TProps, TValueKey>, T extends TProps[TValueKey]>
    (props: TProps, key: TValueKey, changeEventKey: TOnChangeKey, defaultValue: T): [NonUndefined<TProps[TValueKey]> | T, Dispatch<SetStateAction<NonUndefined<TProps[TValueKey]> | T>>];

export function useMaybeControlled<
    TProps extends {},
    TValueKey extends keyof TProps,
    TOnChangeKey extends Exclude<keyof TProps, TValueKey>,
    T extends TProps[TValueKey] | undefined
>(
    props: TProps,
    key: TValueKey,
    changeEventKey: TOnChangeKey,
    defaultValue?: T
): [T, Dispatch<SetStateAction<T>>] {
    const [field, setField] = useState(props[key] as T ?? defaultValue as T);
    
    const isControlled = key in props;
    const controlledValue = props[key];
    const onChange = props[changeEventKey];

    useEffect(() => {
        if (isControlled) {
            setField(controlledValue as T);
        }
    }, [isControlled, controlledValue]);

    const updateField = useCallback((newValue: T | ((oldValue: T) => T)) => {
        onChange?.(newValue);
        if (!isControlled) {
            setField(newValue);
        }
    }, [isControlled, onChange]);

    return [field, updateField];
}
