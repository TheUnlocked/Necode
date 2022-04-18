import { useContext, useEffect } from "react";
import useSWR, { Key, SWRConfiguration } from "swr";
import useSWRImmutable from "swr/immutable";
import useChanged from '../../hooks/ChangedHook';
import { useImpersonation } from '../../hooks/ImpersonationHook';
import fetch from '../../util/fetch';
import { Response } from "../Response";
import LoadingContext from "./LoadingContext";

function isMeEndpoint(endpoint: Key) {
    const regex = /(?:\/|^)me(?:\/|\?|$)/;
    if (typeof endpoint === 'function') {
        endpoint = endpoint();
    }
    if (!endpoint) {
        return false;
    }
    if (typeof endpoint === 'string') {
        return regex.test(endpoint);
    }
    return endpoint.some(x => regex.test(x));
}

function makeUseGetRequest(immutable: boolean) {
    return function useGetRequest<T>(endpoint: Key, options?: SWRConfiguration) {
        const { startDownload, finishDownload } = useContext(LoadingContext);

        const { data, error, isValidating, mutate } = (immutable ? useSWRImmutable : useSWR)<Response<T>, Error>(endpoint, (url: string) => {
            startDownload();
            return fetch(url)
            .then(res => res.json())
            .finally(finishDownload);
        }, options);
        
        const isImpersonatingAndMeEndpointChanged = useChanged(Boolean(useImpersonation()) && isMeEndpoint(endpoint));

        useEffect(() => {
            if (isImpersonatingAndMeEndpointChanged) {
                mutate();
            }
        }, [isImpersonatingAndMeEndpointChanged, mutate])
    
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