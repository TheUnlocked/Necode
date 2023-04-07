import { useSnackbar } from 'notistack';
import { useCallback, useMemo } from 'react';
import useLoadingFetch from './useLoadingFetch';
import { Response } from '~api/Response';

export interface NecodeFetchRequestOptions extends RequestInit {
    errorMessage?: string | ((err: Error) => string | null | undefined) | null;
}

export class NecodeFetchError extends Error {
    name = 'NecodeFetchError';
    constructor(public res: globalThis.Response, message: string) {
        super(message);
    }
}

export type NecodeFetch = <T>(req: RequestInfo, options?: NecodeFetchRequestOptions) => Promise<T>;

export default function useNecodeFetch() {
    const { upload, download } = useLoadingFetch();
    const { enqueueSnackbar } = useSnackbar();

    const createNecodeFetch = useCallback((fetcher: typeof fetch): NecodeFetch => async <T,>(req: RequestInfo, options?: NecodeFetchRequestOptions) => {
        let err: Error;
        try {
            const response = await fetcher(req, options);
            if (response.status === 500) {
                err = new NecodeFetchError(response, 'Internal Server Error');
            }
            else {
                const res: Response<T> = await response.json();

                if (res.response === 'ok') {
                    return res.data;
                }
                err = new NecodeFetchError(response, res.message);
            }
        }
        catch (e) {
            err = e as Error;
        }
        if (options?.errorMessage !== undefined) {
            if (typeof options.errorMessage === 'string') {
                enqueueSnackbar(options.errorMessage, { variant: 'error' });
            }
            else if (options.errorMessage !== null) {
                const msg = options.errorMessage(err);
                if (msg != null) {
                    enqueueSnackbar(msg, { variant: 'error' });
                }
            }
        }
        else {
            enqueueSnackbar(err.toString(), { variant: 'error' });
        }
        throw err;
    }, [enqueueSnackbar]);

    return {
        upload: useMemo(() => createNecodeFetch(upload), [createNecodeFetch, upload]),
        download: useMemo(() => createNecodeFetch(download), [createNecodeFetch, download]),
    };
}