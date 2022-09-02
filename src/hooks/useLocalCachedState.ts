import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import useChanged from './ChangedHook';
import useDirty from './DirtyHook';

type HookResult<T> = [
    state: T,
    setState: Dispatch<SetStateAction<T>>,
    commit: () => void,
    revert: () => void,
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
    ];
}