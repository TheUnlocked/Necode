import { NextApiResponse } from "next";

interface SuccessfulResponse<T> {
    response: 'ok';
    data: T;
    message?: undefined;
}
interface UnsuccessfulResponse {
    response: 'error';
    data?: undefined;
    message: string;
}

export type Response<T> = SuccessfulResponse<T> | UnsuccessfulResponse;
