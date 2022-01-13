export interface ResponsePaginationPart {
    count: number;
    total: number;
    pages: number;
    
    next?: string;
    prev?: string;
}

export interface SuccessfulResponse<T, Options extends { pagination?: boolean } = {}> {
    response: 'ok';
    data: T;
    message?: undefined;
    pagination: Options['pagination'] extends true ? ResponsePaginationPart : unknown;
}
export interface UnsuccessfulResponse {
    response: 'error';
    data?: undefined;
    message: string;
}

export type Response<T, Options extends { pagination?: boolean } = {}> = SuccessfulResponse<T, Options> | UnsuccessfulResponse;
