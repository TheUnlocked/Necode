import { useState } from 'react';

/**
 * Returns true if the value changed between this render and the last render.
 * Always false on the initial render.
 */
export default function useChanged(val: unknown, initialRenderValue = false) {
    const [prevVal, setPrevVal] = useState(() => initialRenderValue ? {} : val);

    if (val !== prevVal) {
        setPrevVal(() => val);
        return true;
    }

    return false;
}

export function useMultiChanged(vals: readonly unknown[], initialRenderValue = false) {
    const [prevVals, setPrevVals] = useState(() => initialRenderValue ? vals.map(() => ({})) : vals);

    if (vals.length !== prevVals.length) {
        throw new Error("Number of dependencies in useMultiChanged changed!");
    }

    for (let i = 0; i < vals.length; i++) {
        if (vals[i] !== prevVals[i]) {
            setPrevVals(vals);
            return true;
        }
    }

    return false;
}
