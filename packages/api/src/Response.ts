import { If } from '~utils/types';

export interface ResponsePaginationPart {
    count: number;
    total: number;
    pages: number;
    
    next?: string;
    prev?: string;
}

export interface RequestOptions {
    pagination?: boolean;
}

export interface DefaultRequestOptions extends RequestOptions {
    pagination: false;
}

export type SuccessfulResponse<T, Options extends RequestOptions = DefaultRequestOptions> = {
    response: 'ok';
    data: T;
    message?: undefined;
} & If<Options['pagination'], { pagination: ResponsePaginationPart }>;

export type UnsuccessfulResponse<Options extends RequestOptions = DefaultRequestOptions> = {
    response: 'error';
    data?: undefined;
    message: string;
} & If<Options['pagination'], { pagination?: undefined }>;

export type Response<T, Options extends RequestOptions = DefaultRequestOptions> = SuccessfulResponse<T, Options> | UnsuccessfulResponse<Options>;
