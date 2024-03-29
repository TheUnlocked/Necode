import { useEffect, useRef } from 'react';

/**
 * Returns true if the value changed between this render and the last render.
 * Always false on the initial render.
 */
export default function useChanged(val: any, initialRenderValue = false) {
    const oldRef = useRef(initialRenderValue ? {} : val);

    useEffect(() => {
        oldRef.current = val;
    }, [val]);

    if (oldRef.current !== val) {
        return true;
    }

    return false;
}