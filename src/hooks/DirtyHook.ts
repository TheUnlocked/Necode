import { Dispatch, SetStateAction, useState } from "react";

export default function useDirty(initial = false): [
    isDirty: boolean,
    markDirty: () => void,
    clearDirty: () => void,
    dirtyCounter: number,
    setDirty: Dispatch<SetStateAction<number>>
] {
    const [counter, setCounter] = useState(initial ? 1 : 0);

    function markDirty() {
        setCounter(x => x + 1);
    }

    function clearDirty() {
        setCounter(0);
    }

    return [
        counter > 0,
        markDirty,
        clearDirty,
        counter,
        setCounter
    ];
}