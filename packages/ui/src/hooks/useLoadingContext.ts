import { createContext, useContext } from "react";

export type LoadingContextInfo = {
    startDownload: () => void,
    finishDownload: () => void,
    startUpload: () => void,
    finishUpload: () => void,
    addDownloadListener: (listener: (downloaders: number) => void) => void,
    addUploadListener: (listener: (uploaders: number) => void) => void,
    removeDownloadListener: (listener: (downloaders: number) => void) => void,
    removeUploadListener: (listener: (uploaders: number) => void) => void,
}; 

const LoadingContext = createContext<LoadingContextInfo>({
    startDownload: () => {},
    finishDownload: () => {},
    startUpload: () => {},
    finishUpload: () => {},
    addDownloadListener: () => {},
    addUploadListener: () => {},
    removeDownloadListener: () => {},
    removeUploadListener: () => {},
});

export const useLoadingContext = () => useContext(LoadingContext);

export default LoadingContext;