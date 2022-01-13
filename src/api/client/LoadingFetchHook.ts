import { useLoadingContext } from "./LoadingContext"

export function useLoadingFetch(): {
    download: typeof fetch,
    upload: typeof fetch
} {
    const { startDownload, finishDownload, startUpload, finishUpload } = useLoadingContext();
    return {
        download(...args) {
            startDownload();
            return fetch.apply(this, args).finally(finishDownload);
        },
        upload(...args) {
            startUpload();
            return fetch.apply(this, args).finally(finishUpload);
        }
    };
}