import { useContext } from "react";
import useSWR, { Key, SWRConfiguration } from "swr";
import useSWRImmutable from "swr/immutable";
import { Response } from "../Response";
import LoadingContext from "./LoadingContext";

function makeUseGetRequest(immutable: boolean) {
    return function useGetRequest<T>(endpoint: Key, options?: SWRConfiguration) {
        const { startDownload, finishDownload } = useContext(LoadingContext);
    
        const { data, error, isValidating, mutate } = (immutable ? useSWRImmutable : useSWR)<Response<T>, Error>(endpoint, (url: string) => {
            startDownload();
            return fetch(url)
                .then(res => res.json())
                .finally(finishDownload);
        }, options);
    
        return {
            data: data?.data,
            error: data?.message ?? error?.message,
            isValidating,
            isLoading: isValidating || (!data?.data && !data?.message && !error?.message),
            mutate
        };
    };
}

export const useGetRequest = makeUseGetRequest(false);
export const useGetRequestImmutable = makeUseGetRequest(true);