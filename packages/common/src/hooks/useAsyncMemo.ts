import { useCallback } from 'react';
import useImported from './useImported';

export default function useAsyncMemo<T>(callback: () => Promise<T>, deps: unknown[]): T | undefined {
    // eslint-disable-next-line @grncdr/react-hooks/exhaustive-deps
    return useImported(useCallback(callback, deps));
}
