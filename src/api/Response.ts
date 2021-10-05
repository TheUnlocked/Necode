import { NextApiResponse } from "next";

interface SuccessfulResponse<T> {
    response: 'ok';
    data: T;
}
interface UnsuccessfulResponse {
    response: 'error';
    message: string;
}

export type Response<T> = SuccessfulResponse<T> | UnsuccessfulResponse;

export function ok<T, R extends NextApiResponse<Response<T>>>(res: R, val: T) {
    res.status(200).send({
        response: 'ok',
        data: val
    });
}
