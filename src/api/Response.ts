import { If } from '../util/types';

export interface ResponsePaginationPart {
    count: number;
    total: number;
    pages: number;
    
    next?: string;
    prev?: string;
}

export type SuccessfulResponse<T, Options extends { pagination?: boolean } = { pagination: false }> = {
    response: 'ok';
    data: T;
    message?: undefined;
} & If<Options['pagination'], { pagination: ResponsePaginationPart }>;

export interface UnsuccessfulResponse {
    response: 'error';
    data?: undefined;
    message: string;
}

export type Response<T, Options extends { pagination?: boolean } = { pagination: false }> = SuccessfulResponse<T, Options> | UnsuccessfulResponse;
