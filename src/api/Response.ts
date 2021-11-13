import { NextApiResponse } from "next";

export interface SuccessfulResponse<T> {
    response: 'ok';
    data: T;
    message?: undefined;
}
export interface UnsuccessfulResponse {
    response: 'error';
    data?: undefined;
    message: string;
}

export type Response<T> = SuccessfulResponse<T> | UnsuccessfulResponse;
