import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import useChanged from './useChanged';
import useDirty from './useDirty';

type HookResult<T> = [
    state: T,
    setState: Dispatch<SetStateAction<T>>,
    commit: () => void,
    revert: () => void,
    isDirty: boolean,
];

export default function useLocalCachedState<T>(externalState: T, setExternalState: (value: T) => void): HookResult<T> {
    const [isDirty, markDirty, clearDirty] = useDirty();
    
    const [state, _setState] = useState(externalState);

    const externalStateChanged = useChanged(externalState);

    useEffect(() => {
        if (externalStateChanged && !isDirty) {
            _setState(externalState);
        }
    }, [isDirty, externalStateChanged, externalState]);

    const setState: typeof _setState = useCallback(st => {
        markDirty();
        _setState(st);
    }, []);

    const commit = useCallback(() => {
        clearDirty();
        if (state !== externalState) {
            setExternalState(state);
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