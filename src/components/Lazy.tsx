import { MutableRefObject, ReactNode, useCallback, useEffect, useState } from "react";

export interface LazyProps {
    children?: ReactNode | undefined;

    show: boolean;

    /**
     * In some cases entirely removing an element from the DOM with `display: none`
     * will cause problems with child components. This will instead use a combination
     * of `visibility: hidden` and `position: absolute` to attain a similar effect.
     */
    keepInDom?: boolean;

    unloadRef?: MutableRefObject<() => void>;
}

export default function Lazy({ show, children, keepInDom = false, unloadRef }: LazyProps) {
    const [hasShown, setHasShown] = useState(show);

    useEffect(() => {
        if (show) {
            setHasShown(true);
        }
    }, [show]);

    const unload = useCallback(() => {
        setHasShown(false);
    }, [])

    if (unloadRef) {
        unloadRef.current = unload;
    }

    if (hasShown) {
        if (keepInDom) {
            if (show) {
                return <div style={{ display: "contents" }}>{children}</div>;
            }
            return <div style={{ visibility: "hidden", position: "absolute" }}>{children}</div>;
        }
        return <div style={{ display: show ? "contents" : "none" }}>{children}</div>;
    }
    return <div style={{ display: "none" }} />
}