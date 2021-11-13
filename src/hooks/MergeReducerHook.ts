import { Dispatch, Reducer, useReducer } from "react";

export type MergeDispatch<T> = Dispatch<Partial<T>>;

export const mergeReducer = <T>(state: T, action: Partial<T>) => ({...state, ...action} as T);

/** Second item in the returned array is stable */
export function useMergeReducer<T>(value: T) {
    return useReducer(mergeReducer as Reducer<T, Partial<T>>, value);
}