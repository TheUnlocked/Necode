import { useCallback, useContext } from "react";
import useSWR, { Key, KeyedMutator, MutatorCallback, MutatorOptions, SWRConfiguration } from "swr";
import { Response } from "~api/Response";
import LoadingContext from "./useLoadingContext";

export interface UseGetRequestResult<T> {
    data: T | undefined;
    error: string | undefined;
    isValidating: boolean;
    isLoading: boolean;
    mutate: KeyedMutator<T>;
    mutateDelete: (callback?: () => Promise<void>) => void;
}

function makeUseGetRequest(immutable: boolean) {
    return function useGetRequest<T>(endpoint: Key, options?: SWRConfiguration): UseGetRequestResult<T> {
        const { startDownload, finishDownload } = useContext(LoadingContext);

        const { data, error, isValidating, mutate } = useSWR<Response<T>, Error>(endpoint, (url: string) => {
            startDownload();
            return fetch(url)
                .then(res => res.json())
                .finally(finishDownload);
        }, {
            ...immutable ? {
                revalidateIfStale: false,
                revalidateOnFocus: false,
                revalidateOnReconnect: false,
            } : undefined,
            ...options,
            ...options?.fallbackData ? { fallbackData: { data: options.fallbackData } } : {},
        });

        const mutateData = useCallback<KeyedMutator<T>>(async <MutData = T>(_obj?: T | Promise<T | undefined> | MutatorCallback<T>, _options?: boolean | MutatorOptions<T, MutData>): Promise<T | MutData | undefined> => {
            const options: Parameters<typeof mutate>[1] = _options === undefined || typeof _options === 'boolean' ? _options : {
                ..._options,
                optimisticData:
                    _options.optimisticData === undefined ? undefined
                    : _options.optimisticData instanceof Function ? (f => (currentData, displayedData) => ({
                        response: 'ok',
                        data: f(currentData?.data, displayedData?.data),
                    }))(_options.optimisticData)
                    : { response: 'ok', data: _options.optimisticData },
                populateCache:
                    _options.populateCache === undefined ? undefined
                    : typeof _options.populateCache === 'boolean' ? _options.populateCache
                    : (f => (result, currentData) => ({
                        response: 'ok',
                        data: f(result as MutData, currentData?.data!)
                    }))(_options.populateCache),
                revalidate:
                    _options.revalidate === undefined ? undefined
                    : typeof _options.revalidate === 'boolean' ? _options.revalidate
                    : (f => (data, key) => f(data.data!, key))(_options.revalidate)
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
                    data: data!,
                }))
                : {
                    response: 'ok',
                    data: _obj,
                };

            return (await mutate<MutData>(obj, options) as Response<T> | undefined)?.data;
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