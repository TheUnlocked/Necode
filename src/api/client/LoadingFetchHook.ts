import { useCallback } from 'react';
import { useLoadingContext } from "./LoadingContext"

export function useLoadingFetch(): {
    download: typeof fetch,
    upload: typeof fetch
} {
    const { startDownload, finishDownload, startUpload, finishUpload } = useLoadingContext();
    return {
        download: useCallback((...args) => {
            startDownload();
            return fetch(...args).finally(finishDownload);
        }, [startDownload, finishDownload]),
        upload: useCallback((...args) => {
            startUpload();
            return fetch(...args).finally(finishUpload);
        }, [startUpload, finishUpload])
    };
}