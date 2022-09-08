import { useSnackbar } from 'notistack';
import { useCallback, useMemo } from 'react';
import { useLoadingFetch } from '../api/client/LoadingFetchHook';
import { Response } from '../api/Response';

export interface NecodeFetchRequestOptions {
    errorMessage?: string | ((err: Error) => string | null | undefined) | null;
}

export default function useNecodeFetch() {
    const { upload, download } = useLoadingFetch();
    const { enqueueSnackbar } = useSnackbar();

    const necodeFetch = useCallback((fetcher: typeof fetch) => async <T,>(req: RequestInfo, options?: RequestInit & NecodeFetchRequestOptions) => {
        let err: Error;
        try {
            const response = await fetcher(req, options);
            if (response.status === 500) {
                err = new Error('Internal Server Error');
            }
            else {
                const res: Response<T> = await response.json();

                if (res.response === 'ok') {
                    return res.data;
                }
                err = new Error(res.message);
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
        upload: useMemo(() => necodeFetch(upload), [necodeFetch, upload]),
        download: useMemo(() => necodeFetch(download), [necodeFetch, download]),
    }
}