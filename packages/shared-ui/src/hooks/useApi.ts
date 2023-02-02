import { EndpointHandle, HttpMethod } from '~api/handles';
import { SWRConfiguration } from "swr";
import { useGetRequest, UseGetRequestResult } from './useGetRequest';
import useNecodeFetch, { NecodeFetch, NecodeFetchRequestOptions } from './useNecodeFetch';
import { useCallback } from 'react';

interface UseApiGetOptions extends SWRConfiguration {
    disabled?: boolean;
}

export function useApiGet<T>(
    endpoint: EndpointHandle<{ GET: { body: undefined, response: T } }>,
    options?: UseApiGetOptions,
): UseGetRequestResult<T> {
    return useGetRequest<T>(
        endpoint._path.some(x => x === undefined) || options?.disabled ? null : endpoint._path.join(''),
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
type TypeError<Message> = { _: Message, [ERROR]: true };
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

function createApiFetch(fetch: NecodeFetch) {
    return function (endpoint, options) {
        if (endpoint._path.some(x => x === undefined)) {
            console.error(`Attempting to fetch undefined resource`, endpoint._path);
        }
        return fetch(
            endpoint._path.join(''),
            {
                ...options as Omit<typeof options, 'body'>,
                ...options?.body ? { body: JSON.stringify(options.body) } : undefined,
            }
        );
    } as ApiFetchFunction;
}

export function useApiFetch() {
    const { download, upload } = useNecodeFetch();

    return {
        // eslint-disable-next-line @grncdr/react-hooks/exhaustive-deps
        download: useCallback(createApiFetch(download), [download]),
        // eslint-disable-next-line @grncdr/react-hooks/exhaustive-deps
        upload: useCallback(createApiFetch(upload), [upload]),
    };
}
