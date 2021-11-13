import { useContext } from "react";
import useSWR, { Key, SWRConfiguration } from "swr";
import { Response } from "../Response";
import LoadingContext from "./LoadingContext";

export default function useGetRequest<T>(endpoint: Key, options?: SWRConfiguration) {
    const { startDownload, finishDownload } = useContext(LoadingContext);

    const { data, error, isValidating, mutate } = useSWR<Response<T>, Error>(endpoint, (url: string) => {
        startDownload();
        return fetch(url)
            .then(res => res.json())
            .finally(finishDownload);
    }, options);

    return {
        data: data?.data,
        error: data?.message ?? error?.message,
        isValidating,
        mutate
    };
}