import { EndpointHandle, HttpMethod } from '~api/handles';
import { SWRConfiguration } from "swr";
import { useGetRequest, UseGetRequestResult } from './useGetRequest';
import useNecodeFetch, { NecodeFetchRequestOptions } from './useNecodeFetch';
import { useCallback } from 'react';

export function useApiGet<T>(
    endpoint: EndpointHandle<{ GET: { body: undefined, response: T } }>,
    options?: SWRConfiguration
): UseGetRequestResult<T> {
    return useGetRequest<T>(
        endpoint._path,
        {
            ...endpoint._imm ? {
                revalidateIfStale: false,
                revalidateOnFocus: false,
                revalidateOnReconnect: false,
            } : undefined,
            ...options,
        },
    );
}

declare const ERROR: unique symbol;
type TypeError<Message> = { _: Message, [ERROR]: true }
type ApiFetchFunction = <E extends EndpointHandle<any>, Method extends HttpMethod>(
    endpoint: E,
    options?: Omit<NecodeFetchRequestOptions, 'body'>
        & ((HttpMethod extends Method ? 'GET' : Method) extends 'GET'
            ? { body?: undefined }
            : E extends EndpointHandle<{ [_ in Method]: { body: infer B, response: any } }>
                ? { method: Method, body: B }
                : TypeError<`${Method} is not supported on endpoint`>),
) => E extends EndpointHandle<{ [_ in (HttpMethod extends Method ? 'GET' : Method)]: { body: any, response: infer R } }>
    ? Promise<R>
    : TypeError<`${Method} is not supported on endpoint`>;

export function useApiFetch() {
    const { download, upload } = useNecodeFetch();

    return {
        download: useCallback((endpoint, options) => {
            return download(
                endpoint._path,
                {
                    ...options as Omit<typeof options, 'body'>,
                    ...options?.body ? { body: JSON.stringify(options.body) } : undefined,
                }
            );
        }, [download]) as ApiFetchFunction,
        upload: useCallback((endpoint, options) => {
            return upload(
                endpoint._path,
                {
                    ...options as Omit<typeof options, 'body'>,
                    ...options?.body ? { body: JSON.stringify(options.body) } : undefined,
                }
            );
        }, [upload]) as ApiFetchFunction,
    }
}
