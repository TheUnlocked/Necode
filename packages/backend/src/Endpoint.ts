import { Schema } from "joi";
import { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { Entity } from "~api/entities/Entity";
import { Response, ResponsePaginationPart } from "~api/Response";
import { Session } from "next-auth";
import { IfAny } from "~utils/types";
import { EntityReference, EntityReferenceArray, ReferenceDepth } from "~api/entities/EntityReference";
import getIdentity from './identity';
import { Readable } from 'stream';

export enum Status {
    OK = 200,
    CREATED = 201,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    CONFLICT = 409,
    INTERNAL_SERVER_ERROR = 500,
    NOT_IMPLEMENTED = 501
}

const defaultStatusMessages: { [Code in Status]: string } = {
    [Status.OK]: 'OK',
    [Status.CREATED]: 'Created',
    [Status.BAD_REQUEST]: 'Bad Request',
    [Status.UNAUTHORIZED]: 'Unauthorized',
    [Status.FORBIDDEN]: 'Forbidden',
    [Status.NOT_FOUND]: 'Not Found',
    [Status.CONFLICT]: 'Conflict',
    [Status.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
    [Status.NOT_IMPLEMENTED]: 'Not Yet Implemented',
};

export interface OkOptions {
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

type okCallback<T> = (x: T, options?: OkOptions) => void;
type failCallback = (type: Status, message?: string) => void;


type QueryParamsObject<T extends string> = {
    [Key in T as Key extends `${infer RealKey}[]` ? RealKey
            : Key extends `${infer RealKey}?` ? RealKey
            : Key]
        : Key extends `${string}[]`
            ? string[]
        : Key extends `${string}?`
            ? string | undefined
        : string
};

export interface EndpointHandlerObject<Req, QueryParams extends string> {
    query: QueryParamsObject<QueryParams>,
    body: Req,
    bodyStream: Readable,
    session?: Session | undefined
}

export interface Endpoint<Req, Res, QueryParams extends string> {
    /**
     * @default true
     */
    loginValidation?: boolean;

    schema?: Schema<Req>;

    handler: EndpointCallback<EndpointHandlerObject<Req, QueryParams>, Res>;
}

export type EndpointCallback<Req, Res> = (
    req: Req,
    ok: okCallback<Res>, fail: failCallback
) => void | PromiseLike<void>;

export interface EndpointMap<
    QueryParams extends string,
    GetReq = any, GetRes = any,
    PostReq = any, PostRes = any,
    PutReq = any, PutRes = any,
    PatchReq = any, PatchRes = any,
    DeleteReq = any, DeleteRes = any
> {
    GET?: Endpoint<GetReq, GetRes, QueryParams>;
    POST?: Endpoint<PostReq, PostRes, QueryParams>;
    PUT?: Endpoint<PutReq, PutRes, QueryParams>;
    PATCH?: Endpoint<PatchReq, PatchRes, QueryParams>;
    DELETE?: Endpoint<DeleteReq, DeleteRes, QueryParams>;
}


export type AttributesOf<E extends EntityReference<Entity<any, any>, ReferenceDepth>> =
    E extends Entity<any, any>
        ? Omit<E['attributes'], keyof { [
            K in keyof E['attributes'] as
                IfAny<E['attributes'][K], 1, 0> extends 1 ? never
                : E['attributes'][K] extends EntityReference<Entity<any, any>, ReferenceDepth>
                    ? K
                : E['attributes'][K] extends EntityReferenceArray<Entity<any, any>, ReferenceDepth>
                    ? K
                : never]: 1
            }> & {
                [ K in keyof E['attributes'] as
                    IfAny<E['attributes'][K], 1, 0> extends 1 ? never
                    : E['attributes'][K] extends EntityReference<Entity<any, any>, ReferenceDepth>
                        ? K
                    : E['attributes'][K] extends EntityReferenceArray<Entity<any, any>, ReferenceDepth>
                        ? K
                    : never
                ]
                    : E['attributes'][K] extends EntityReference<Entity<any, any>, ReferenceDepth>
                        ? AttributesOf<E['attributes'][K]>
                    : E['attributes'][K] extends EntityReferenceArray<infer L, ReferenceDepth>
                        ? ({ id: string } & AttributesOf<L>)[]
                        : never
            }
        : {};

export type PartialAttributesOf<E extends EntityReference<Entity<any, any>, ReferenceDepth>> =
    E extends Entity<any, any>
        ? Omit<Partial<E['attributes']>, keyof { [
            K in keyof E['attributes'] as
                IfAny<E['attributes'][K], 1, 0> extends 1 ? never
                : E['attributes'][K] extends EntityReference<Entity<any, any>, ReferenceDepth>
                    ? K
                : E['attributes'][K] extends EntityReferenceArray<Entity<any, any>, ReferenceDepth>
                    ? K
                : never]: 1
            }> & {
                [ K in keyof E['attributes'] as
                    IfAny<E['attributes'][K], 1, 0> extends 1 ? never
                    : E['attributes'][K] extends EntityReference<Entity<any, any>, ReferenceDepth>
                        ? K
                    : E['attributes'][K] extends EntityReferenceArray<Entity<any, any>, ReferenceDepth>
                        ? K
                    : never
                ]?
                    : E['attributes'][K] extends EntityReference<Entity<any, any>, ReferenceDepth>
                        ? PartialAttributesOf<E['attributes'][K]>
                    : E['attributes'][K] extends EntityReferenceArray<infer L, ReferenceDepth>
                        ? ({ id: string } & PartialAttributesOf<L>)[]
                        : never
            }
        : {};

export type EntityEndpoints<E extends Entity<any, any>, QueryParams extends string> = {
    type: 'entity'
} & EndpointMap<
    QueryParams,
    undefined, E,
    unknown, unknown,
    AttributesOf<E>, E,
    PartialAttributesOf<E>, E,
    undefined, void
>;

export type EntityTypeEndpoints<E extends Entity<any, any>, QueryParams extends string> = {
    type: 'entityType'
} & EndpointMap<
    QueryParams,
    undefined, E[],
    AttributesOf<E>, E,
    unknown, unknown,
    unknown, unknown,
    unknown, unknown
>;

export type SortableEntityTypeEndpoints<E extends Entity<any, any>, QueryParams extends string> = {
    type: 'entityType.sortable'
} & EndpointMap<
    QueryParams,
    undefined, E[],
    AttributesOf<E>, E,
    unknown, unknown,
    { id: string, attributes?: PartialAttributesOf<E> }[], E[],
    unknown, unknown
>;

export type EndpointResult<P extends string, Endpoints extends Partial<EndpointMap<any>>> = NextApiHandler<any> & {
    [Method in keyof Endpoints]: Endpoints[Method] extends Endpoint<any, any, P>
        ? Endpoints[Method] & { execute: ExecuteMethod<P, Endpoints[Method]> }
        : Endpoints[Method]
};

// Proper typing causes issues with express middleware. While express middleware
// are not guaranteed to work with nodejs, most of the time they will.
export type Middleware = (req: any, res: any, next: (resultOrError?: any) => void) => void;

function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: Middleware) {
    return new Promise((resolve, reject) => {
        fn(req, res, (result) => {
            if (result instanceof Error) {
                return reject(result);
            }
    
            return resolve(result);
        });
    });
}

export function endpoint
    <P extends string, Endpoints extends EntityEndpoints<E, P>, E extends Entity<any, any>>
    (example: E | ((...args: any[]) => E), mandatoryParams: readonly P[], endpoints: Endpoints & { middleware?: Middleware[] }): EndpointResult<P, Endpoints>;

export function endpoint
    <P extends string, Endpoints extends EntityTypeEndpoints<E, P>, E extends Entity<any, any>>
    (example: E | ((...args: any[]) => E), mandatoryParams: readonly P[], endpoints: Endpoints & { middleware?: Middleware[] }): EndpointResult<P, Endpoints>;

export function endpoint
    <P extends string, Endpoints extends SortableEntityTypeEndpoints<E, P>, E extends Entity<any, any>>
    (example: E | ((...args: any[]) => E), mandatoryParams: readonly P[], endpoints: Endpoints & { middleware?: Middleware[] }): EndpointResult<P, Endpoints>;

export function endpoint
    <P extends string, Endpoints extends EndpointMap<P> & { type: 'other' }>
    (options: any, mandatoryParams: readonly P[], endpoints: Endpoints & { middleware?: Middleware[] }): EndpointResult<P, Endpoints>;

export function endpoint<P extends string, Endpoints extends EndpointMap<P>>(_: any, mandatoryParams: readonly P[], endpoints: Endpoints & { middleware?: Middleware[] }) {
    async function handler(
        req: NextApiRequest,
        res: NextApiResponse<Response<any, any>>
    ) {
        for (const middleware of endpoints.middleware ?? []) {
            await runMiddleware(req, res, middleware);
        }

        function ok(result: any, options?: OkOptions) {
            let pagination: ResponsePaginationPart | undefined = undefined;

            if (options?.pagination) {
                if (!(result instanceof Array)) {
                    throw new Error('Pagination result must be an array');
                }

                const nextPageUrl = new URL(req.url!, `https://${req.headers.host}`);
                const prevPageUrl = new URL(req.url!, `https://${req.headers.host}`);

                let showNextPageUrl
                    = result.length > 0
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

                pagination = {
                    next: showNextPageUrl
                        ? nextPageUrl.toString().replace(/%3A/g, ':')
                        : undefined,
                    prev: prevPageUrl.searchParams.has('page:index')
                        ? prevPageUrl.toString().replace(/%3A/g, ':')
                        : undefined,
                    
                    count: result.length,
                    pages: options.pagination.pages,
                    total: options.pagination.total
                };
            }

            res.status(Status.OK).send({
                response: 'ok',
                data: result,
                pagination
            });
        }

        function fail(status: Status, message?: string) {
            res.status(status).send({
                response: 'error',
                message: message ?? defaultStatusMessages[status]
            });
        }

        const method = req.method;
        if (method && method in endpoints) {
            const endpoint = endpoints[method as keyof EndpointMap<any>]!;

            let session: Session | undefined;

            if (endpoint.loginValidation !== false) {
                const identityResult = await getIdentity(req, res);
                switch (identityResult) {
                    case 'not-logged-in':
                        return fail(Status.UNAUTHORIZED, 'Not logged in');
                    case 'cannot-impersonate':
                        return fail(Status.FORBIDDEN, 'Either you do not have the rights to impersonate that user, or the Impersonate header is invalid');
                }
                session = identityResult;
            }

            const cleanedParams = {} as any;

            for (const param of mandatoryParams) {
                const cleanParam = param.replace(/(\[]|\?)$/, '');
                const value = req.query[cleanParam];
                if (param.endsWith('[]')) {
                    if (value) {
                        cleanedParams[cleanParam] = ([] as string[]).concat(value);
                    }
                    else {
                        cleanedParams[cleanParam] = [];
                    }
                }
                else {
                    if (value) {
                        if (typeof value === 'string') {
                            cleanedParams[cleanParam] = value;
                        }
                        else {
                            cleanedParams[cleanParam] = value.at(-1);
                        }
                    }
                    else if (!param.endsWith('?')) {
                        return fail(Status.BAD_REQUEST, `Missing query or URL parameter ${cleanParam}`);
                    }
                }
            }

            let body: any = undefined;

            if (req.body) {
                try {
                    body = JSON.parse(req.body);
                }
                catch (e) {
                    return fail(Status.BAD_REQUEST);
                }
            }

            if (endpoint.schema) {
                const { value, error } = endpoint.schema.validate(body, {
                    abortEarly: false,
                    presence: 'required'
                });

                if (error) {
                    return fail(Status.BAD_REQUEST, error.annotate(true));
                }

                body = value;
            }

            try {
                return endpoint.handler({ query: cleanedParams, body, bodyStream: req, session }, ok, fail);
            }
            catch (e) {
                return fail(Status.INTERNAL_SERVER_ERROR);
            }
        }
        else {
            return fail(Status.BAD_REQUEST, `${req.method} is not supported on this endpoint`);
        }
    }

    return Object.assign(handler, Object.fromEntries(
        Object.entries(endpoints)
            .map(([name, obj]) => [name, {
                ...obj,
                execute: execute satisfies ExecuteMethod<P, Endpoint<any, any, P>>
            }])
    ));
}

type ExecuteMethod<P extends string, E extends Endpoint<any, any, P>> = (
    this: E,
    obj: Parameters<E['handler']>[0],
) => Promise<Response<Parameters<Parameters<E['handler']>[1]>[0]>>;

function execute<E extends Endpoint<any, any, any>>(this: E, obj: EndpointHandlerObject<unknown, string>) {
    return new Promise<Response<Parameters<Parameters<E['handler']>[1]>[0]>>(async resolve => {
        function ok(result: any) {
            resolve({
                response: 'ok',
                data: result
            });
        }

        function fail(status: Status, message?: string) {
            resolve({
                response: 'error',
                message: message ?? defaultStatusMessages[status]
            });
        }

        return this.handler(obj, ok, fail);
    });

}