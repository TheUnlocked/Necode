import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import useChanged from './useChanged';
import useDirty from './useDirty';

export interface CommitOptions<T> {
    value?: T;
}

type HookResult<T> = [
    state: T,
    setState: Dispatch<SetStateAction<T>>,
    commit: (options?: CommitOptions<T>) => void,
    revert: () => void,
    isDirty: boolean,
];

export default function useLocalCachedState<T>(externalState: T, setExternalState: (value: T) => void): HookResult<T> {
    const [isDirty, markDirty, clearDirty] = useDirty();
    
    const [state, _setState] = useState(externalState);

    const externalStateChanged = useChanged(externalState);

    if (externalStateChanged && !isDirty) {
        _setState(externalState);
    }

    const setState: typeof _setState = useCallback(st => {
        _setState(oldVal => {
            const newVal = st instanceof Function ? st(oldVal) : st;
            if (newVal !== oldVal) {
                markDirty();
            }
            return newVal;
        });
    }, []);

    const commit = useCallback((options?: CommitOptions<T>) => {
        clearDirty();
        const newState = options && 'value' in options ? options.value! : state;
        if (newState !== externalState) {
            setExternalState(newState);
        }
    }, [setExternalState, externalState, state]);

    const revert = useCallback(() => {
        clearDirty();
        _setState(externalState);
    }, [externalState]);

    return [
        state,
        setState,
        commit,
        revert,
        isDirty,
    ];
}