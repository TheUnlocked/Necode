import { useCallback } from 'react';
import useImported from '~shared-ui/hooks/useImported';

export default function useAsyncMemo<T>(callback: () => Promise<T>, deps: unknown[]): T | undefined {
    // eslint-disable-next-line @grncdr/react-hooks/exhaustive-deps, react-hooks/use-memo
    return useImported(useCallback(callback, deps));
}
