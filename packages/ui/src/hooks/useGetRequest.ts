import { useCallback, useContext, useEffect } from "react";
import useSWR, { Key, KeyedMutator, SWRConfiguration } from "swr";
import useSWRImmutable from "swr/immutable";
import useChanged from '~shared-ui/hooks/useChanged';
import { useImpersonation } from './useImpersonation';
import { Response } from "~api/Response";
import LoadingContext from "~shared-ui/hooks/useLoadingContext";

function isVolatileEndpoint(endpoint: Key) {
    const regex = /(?:\/|^)(?:me|live)(?:\/|\?|$)/;
    if (typeof endpoint === 'function') {
        endpoint = endpoint();
    }
    if (!endpoint) {
        return false;
    }
    if (typeof endpoint === 'string') {
        return regex.test(endpoint);
    }
    return (endpoint as string[]).some(x => regex.test(x));
}

function makeUseGetRequest(immutable: boolean) {
    return function useGetRequest<T>(endpoint: Key, options?: SWRConfiguration) {
        const { startDownload, finishDownload } = useContext(LoadingContext);

        const { data, error, isValidating, mutate } = (immutable ? useSWRImmutable : useSWR)<Response<T>, Error>(endpoint, (url: string) => {
            startDownload();
            return fetch(url)
                .then(res => res.json())
                .finally(finishDownload);
        }, {
            ...options,
            ...options?.fallbackData ? { fallbackData: { data: options.fallbackData } } : {},
        });
        
        const volatileEndpointAndImpersonatingChanged = useChanged(Boolean(useImpersonation()) && isVolatileEndpoint(endpoint));

        useEffect(() => {
            if (volatileEndpointAndImpersonatingChanged) {
                mutate();
            }
        }, [volatileEndpointAndImpersonatingChanged, mutate]);

        const mutateData = useCallback<KeyedMutator<T>>((_obj, _options) => {
            const options: Parameters<typeof mutate>[1] = _options === undefined || typeof _options === 'boolean' ? _options : {
                ..._options,
                optimisticData
                    : _options.optimisticData === undefined ? undefined
                    : _options.optimisticData instanceof Function ? currentData => ({
                        response: 'ok',
                        data: (_options.optimisticData as (currentData?: T | undefined) => T)(currentData?.data),
                    })
                    : { response: 'ok', data: _options.optimisticData },
                populateCache
                    : _options.populateCache === undefined ? undefined
                    : typeof _options.populateCache === 'boolean' ? _options.populateCache
                    : (result, currentData) => ({
                        response: 'ok',
                        data: (_options.populateCache as (result: any, currentData: T) => T)(result, currentData.data!)
                    }),
            };

            const obj: Parameters<typeof mutate>[0]
                = _obj === undefined ? undefined
                : _obj instanceof Function ? current => {
                    const data = _obj(current?.data);
                    if (data) {
                        if (data instanceof Promise) {
                            return data.then(data => data === undefined ? undefined : ({
                                response: 'ok',
                                data, 
                            }));
                        }
                        return {
                            response: 'ok',
                            data, 
                        };
                    }
                }
                : _obj instanceof Promise ? _obj.then(data => ({
                    response: 'ok',
                    data,
                }))
                : {
                    response: 'ok',
                    data: _obj,
                };

            return mutate(obj, options).then(x => x?.data);
        }, [mutate]);

        const mutateDelete = useCallback((callback?: () => Promise<void>) => {
            const err = {
                response: 'error',
                message: 'Deleted by client',
            } as Response<T>;
            mutate(async () => {
                await callback?.();
                return err;
            }, { optimisticData: err, rollbackOnError: true });
        }, [mutate]);
    
        return {
            data: data?.data,
            error: data?.message ?? error?.message,
            isValidating,
            isLoading: !data?.data && !data?.message && !error?.message,
            mutate: mutateData,
            mutateDelete,
        };
    };
}

export const useGetRequest = makeUseGetRequest(false);
export const useGetRequestImmutable = makeUseGetRequest(true);