import { MutableRefObject, ReactNode, useCallback, useEffect, useState } from "react";
import useImported from '../hooks/useImported';
import { Importable } from '~utils/types';

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

export interface LazyImportableProps<T> extends Omit<LazyProps, 'children'> {
    fallback?: ReactNode;
    importable: Importable<T>;
    render: (imported: T) => ReactNode | undefined;
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
    }, []);

    if (unloadRef) {
        unloadRef.current = unload;
    }

    if (hasShown) {
        if (keepInDom) {
            if (show) {
                return <div style={{ display: "contents" }}>{children}</div>;
            }
            return <div style={{ visibility: "hidden", position: "fixed", height: "inherit" }}>{children}</div>;
        }
        return <div style={{ display: show ? "contents" : "none" }}>{children}</div>;
    }
    return <div style={{ display: "none" }} />;
}

export function LazyImportable<T>({ show, keepInDom = false, unloadRef, importable, fallback, render }: LazyImportableProps<T>) {
    const [hasShown, setHasShown] = useState(show);

    useEffect(() => {
        if (show) {
            setHasShown(true);
        }
    }, [show]);

    const unload = useCallback(() => {
        setHasShown(false);
    }, []);

    if (unloadRef) {
        unloadRef.current = unload;
    }

    const imported = useImported(show || hasShown ? importable : undefined);

    if (imported !== undefined) {
        if (keepInDom) {
            if (show) {
                return <div style={{ display: "contents" }}>{render(imported)}</div>;
            }
            return <div style={{ visibility: "hidden", position: "fixed", height: "inherit" }}>{render(imported)}</div>;
        }
        return <div style={{ display: show ? "contents" : "none" }}>{render(imported)}</div>;
    }

    if (show && fallback) {
        return <div style={{ display: "contents" }}>{fallback}</div>;
    }
    return <div style={{ display: "none" }} />;
}