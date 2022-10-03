import { useEffect, useRef } from "react";

export default function useOnOpen(open: boolean, callback: () => void) {
    const wasOpenRef = useRef(false);

    useEffect(() => {
        if (open && !wasOpenRef.current) {
            callback();
        }
        wasOpenRef.current = open;
    }, [open, callback]);
}