import Joi from 'joi';
import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { Session } from 'next-auth';
import { If, Nominal } from '../util/types';
import { defaultStatusMessages, PartialAttributesOf, Status } from './Endpoint';
import { Entity } from './entities/Entity';
import { SuccessfulResponse } from './Response';
import getIdentity from './server/identity';

declare const CALLBACK_ACCEPT: unique symbol;
type CallbackResult = Nominal<void, typeof CALLBACK_ACCEPT>;;
type OkCallback<T, ResMeta> = (x: T, options?: ResMeta) => CallbackResult;
type FailCallback = (type: Status, message?: string) => CallbackResult;

interface PaginationReqFields {
    pagination: {
        recordsPerPage: number;
    } &
        ( { pageIndex: number; }
        | { fromRecordId: string; } )
}

interface PaginationResFields {
    pagination?: ({
        cursor: string,
        index?: number
    } | {
        cursor?: undefined,
        index: number
    }) & {
        count?: number,
        pages: number,
        total: number
    };
}

interface BodyReqFields<T> {
    body: T;
}

type QueryParamsObject<T extends string> = {
    [Key in T as Key extends `${infer RealKey}[]` ? RealKey
        : Key extends `${infer RealKey}?` ? RealKey
        : Key
    ]: string extends T
        ? string[] | string | undefined
        : Key extends `${string}[]`
        ? string[]
        : Key extends `${string}?`
        ? string | undefined
        : string
};

type RequestFields<QueryParams extends string, Authenticated extends boolean, AdditionalFields extends {} = {}> = {
    query: QueryParamsObject<QueryParams>;
    session: Authenticated extends true ? Session : undefined;
    _request: NextApiRequest;
    _response: NextApiResponse;
} & AdditionalFields;

export type EndpointCallback<QueryParams extends string, Authenticated extends boolean, ResData, ReqFields extends {} = {}, ResFields extends {} = {}> = (
    req: RequestFields<QueryParams, Authenticated, ReqFields>,
    ok: OkCallback<ResData, ResFields>, fail: FailCallback,
) => CallbackResult | Promise<CallbackResult>;

type GetEndpoint<ResourceType, QueryParams extends string> = <R = ResourceType, ExtraQueryParams extends readonly string[] = readonly [], RequiresAuth extends boolean = false, IsPaginated extends boolean = false>(
    options: {
        _resultType?: R;
        query?: ExtraQueryParams;
        auth?: RequiresAuth;
        paginated?: IsPaginated;
    },
    callback: EndpointCallback<QueryParams | ExtraQueryParams[number], RequiresAuth, R, If<IsPaginated, PaginationReqFields, {}>, If<IsPaginated, PaginationResFields, {}>>
) => ResourceApi<ResourceType, QueryParams, { get: EndpointCallback<QueryParams | ExtraQueryParams[number], RequiresAuth, R, If<IsPaginated, PaginationReqFields, {}>, If<IsPaginated, PaginationResFields, {}>> }>;

type PostEndpoint<ResourceType, QueryParams extends string, Body = unknown, Method extends string = 'post'> = <R = ResourceType, ExtraQueryParams extends readonly string[] = readonly [], B = Body, RequiresAuth extends boolean = false>(
    options: {
        _resultType?: R;
        query?: ExtraQueryParams;
        auth?: RequiresAuth;
        schema?: Joi.Schema<B>;
    },
    callback: EndpointCallback<QueryParams | ExtraQueryParams[number], RequiresAuth, R, BodyReqFields<B>>
) => ResourceApi<ResourceType, QueryParams, { [_ in Method]: EndpointCallback<QueryParams | ExtraQueryParams[number], RequiresAuth, R, BodyReqFields<B>> }>;

type PutEndpoint<ResourceType, QueryParams extends string, Body = ResourceType> = PostEndpoint<ResourceType, QueryParams, Body, 'put'>;
type PatchEndpoint<ResourceType, QueryParams extends string, Body = ResourceType extends Entity<any, any> ? PartialAttributesOf<ResourceType> : Partial<ResourceType>> = PostEndpoint<ResourceType, QueryParams, Body, 'patch'>;
type DeleteEndpoint<ResourceType, QueryParams extends string, Body = ResourceType extends Entity<any, any> ? ResourceType['id'] : ResourceType> = PostEndpoint<ResourceType, QueryParams, Body, 'delete'>;

// Proper typing causes issues with express middleware. While express middleware
// are not guaranteed to work with nextjs, most of the time they will.
type ExpressMiddleware = (req: any, res: any, next: (err?: any) => void) => void;

export type ResourceApi<ResourceType, QueryParams extends string, ResourceMethods extends {}> = Omit<{
    get: GetEndpoint<ResourceType, QueryParams>;
    post: PostEndpoint<ResourceType, QueryParams>;
    put: PutEndpoint<ResourceType, QueryParams>;
    patch: PatchEndpoint<ResourceType, QueryParams>;
    delete: DeleteEndpoint<ResourceType, QueryParams>;
    
    use(middleware: ExpressMiddleware): ResourceApi<ResourceType, QueryParams, ResourceMethods>;
    build(): NextApiHandler<any> & ResourceMethods;
}, keyof ResourceMethods>;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

class Resource implements ResourceApi<any, string, {}> {
    private readonly _middlewares = [] as ExpressMiddleware[];

    private readonly _methods = {} as {
        'get'?: Parameters<GetEndpoint<any, string>>;
        'post'?: Parameters<PostEndpoint<any, string>>;
        'put'?: Parameters<PutEndpoint<any, string>>;
        'patch'?: Parameters<PatchEndpoint<any, string>>;
        'delete'?: Parameters<DeleteEndpoint<any, string>>;
    };

    constructor(private readonly _sharedQueryParams: readonly string[]) {}

    use(middleware: ExpressMiddleware): ResourceApi<any, string, {}> {
        this._middlewares.push(middleware);
        return this;
    }

    build() {
        const methodsTable = Object.fromEntries(
            Object.entries(this._methods).map(([method, data]) => [method.toUpperCase, data])
        ) as {
            [MethodName in keyof typeof this._methods as Uppercase<MethodName>]: (typeof this._methods)[MethodName]
        };

        const handler: NextApiHandler<any> = async (req, res): Promise<CallbackResult> => {
            const responseModifiers = [] as ((response: SuccessfulResponse<any, any>, options: any) => SuccessfulResponse<any, any>)[];

            const ok: OkCallback<any, any> = (result, options) => {
                res.status(Status.OK).send(
                    responseModifiers.reduce((prev, mod) => mod(prev, options), {
                        response: 'ok',
                        data: result,
                    } as SuccessfulResponse<any, any>)
                );
                return undefined!;
            };
    
            const fail: FailCallback = (status, message) => {
                res.status(status).send({
                    response: 'error',
                    message: message ?? defaultStatusMessages[status]
                });
                return undefined!;
            };

            for (const middleware of this._middlewares) {
                await new Promise<void>((resolve, reject) => {
                    middleware(req, res, (...args) => {
                        if (args.length > 0) {
                            return reject(args[0])
                        }
                        return resolve();
                    });
                });
            }

            const method = req.method as HttpMethod;

            if (methodsTable[method]) {
                const [options, callback] = methodsTable[method]!;

                const result = {
                    _request: req,
                    _response: res,
                } as RequestFields<string, boolean, PaginationReqFields & BodyReqFields<any>>;

                if (options.auth) {
                    const identityResult = await getIdentity(req);
                    switch (identityResult) {
                        case 'not-logged-in':
                            return fail(Status.UNAUTHORIZED, 'Not logged in');
                        case 'cannot-impersonate':
                            return fail(Status.FORBIDDEN, 'Either you do not have the rights to impersonate that user, or the Impersonate header is invalid');
                    }
                    result.session = identityResult;
                }

                result.query = {};
                for (const param of this._sharedQueryParams.concat(options.query ?? [])) {
                    const cleanParam = param.replace(/(\[]|\?)$/, '');
                    const value = req.query[cleanParam];
                    if (param.endsWith('[]')) {
                        if (value) {
                            result.query[cleanParam] = ([] as string[]).concat(req.query[cleanParam]);
                        }
                        else {
                            result.query[cleanParam] = [];
                        }
                    }
                    else {
                        if (value) {
                            if (typeof value === 'string') {
                                result.query[cleanParam] = value;
                            }
                            else {
                                result.query[cleanParam] = value.at(-1);
                            }
                        }
                        else if (!param.endsWith('?')) {
                            return fail(Status.BAD_REQUEST, `Missing query or URL parameter ${cleanParam}`);
                        }
                    }
                }

                if ('paginated' in options && options.paginated) {
                    const {
                        'page:index': pageIndexRaw,
                        'page:from': fromRecordId,
                        'page:count': recordsPerPageRaw,
                    } = req.query;

                    const recordsPerPage = +(recordsPerPageRaw ?? 10);

                    if (isNaN(recordsPerPage) || recordsPerPage % 1 !== 0 || recordsPerPage < 1) {
                        return fail(Status.BAD_REQUEST, 'page:count must be a postive interger');
                    }

                    const pageIndex = pageIndexRaw !== undefined ? +pageIndexRaw : undefined;

                    if (pageIndex && (isNaN(pageIndex) || pageIndex % 1 !== 0 || pageIndex < 0)) {
                        return fail(Status.BAD_REQUEST, 'page:index must be a non-negative interger');
                    }

                    if (fromRecordId === undefined) {
                        result.pagination = {
                            recordsPerPage,
                            pageIndex: pageIndex ?? 0,
                        };
                    }
                    else {
                        if (pageIndex !== undefined) {
                            return fail(Status.BAD_REQUEST, 'Cannot use both page:index and page:from at the same time');
                        }

                        result.pagination = {
                            recordsPerPage,
                            fromRecordId: fromRecordId instanceof Array ? fromRecordId.at(-1)! : fromRecordId,
                        };
                    }

                    responseModifiers.push((response, options) => {
                        const data = response.data;
                        
                        if (!(data instanceof Array)) {
                            throw new Error('Pagination result must be an array');
                        }
        
                        const nextPageUrl = new URL(req.url!, `https://${req.headers.host}`);
                        const prevPageUrl = new URL(req.url!, `https://${req.headers.host}`);
        
                        let showNextPageUrl
                            = data.length > 0
                            && (!options.pagination.index || options.pagination.index < options.pagination.pages);
        
                        for (const url of [nextPageUrl, prevPageUrl]) {
                            url.searchParams.delete('page:index');
                            url.searchParams.delete('page:from');
                            url.searchParams.delete('page:count');
                        }
        
                        if (options.pagination.index !== undefined) {
                            nextPageUrl.searchParams.set('page:index', `${options.pagination.index + 1}`);
                            if (options.pagination.index > 1) {
                                prevPageUrl.searchParams.set('page:index', `${options.pagination.index - 1}`);
                            }
                        }
                        if (options.pagination.cursor !== undefined) {
                            nextPageUrl.searchParams.set('page:from', options.pagination.cursor);
                        }
                        if (options.pagination.count !== undefined) {
                            nextPageUrl.searchParams.set('page:count', `${options.pagination.count}`);
                            prevPageUrl.searchParams.set('page:count', `${options.pagination.count}`);
                        }
        
                        response.pagination = {
                            next: showNextPageUrl
                                ? nextPageUrl.toString().replace(/%3A/g, ':')
                                : undefined,
                            prev: prevPageUrl.searchParams.has('page:index')
                                ? prevPageUrl.toString().replace(/%3A/g, ':')
                                : undefined,
                            
                            count: data.length,
                            pages: options.pagination.pages,
                            total: options.pagination.total
                        };

                        return response;
                    });
                }

                if ('schema' in options && options.schema !== undefined) {
                    const { value, error } = options.schema.validate(req.body, {
                        abortEarly: false,
                        presence: 'required'
                    });

                    if (error) {
                        return fail(Status.BAD_REQUEST, error.annotate(true));
                    }
    
                    result.body = value;
                }

                return callback(result, ok, fail);
            }

            return fail(Status.BAD_REQUEST, `${method} is not supported on this endpoint`);
        };
        return Object.assign(handler, this._methods);
    }

    get: GetEndpoint<any, string> = (...args) => {
        // @ts-ignore
        this._methods.get = args;
        return this as any;
    }

    post: PostEndpoint<any, string> = (...args) => {
        // @ts-ignore
        this._methods.post = args;
        return this as any;
    }

    put: PutEndpoint<any, string> = (...args) => {
        // @ts-ignore
        this._methods.put = args;
        return this as any;
    }
    
    patch: PatchEndpoint<any, string> = (...args) => {
        // @ts-ignore
        this._methods.patch = args;
        return this as any;
    }
    
    delete: DeleteEndpoint<any, string> = (...args) => {
        // @ts-ignore
        this._methods.delete = args;
        return this as any;
    }
    
}

export function resource<QueryParams extends readonly string[]>(queryParams: QueryParams): (<ResourceType>() => ResourceApi<ResourceType, QueryParams[number], {}>) & ResourceApi<undefined, QueryParams[number], {}> {
    const resourceObj = new Resource(queryParams);
    return Object.assign(() => resourceObj, resourceObj);
}

resource(['a'] as const)