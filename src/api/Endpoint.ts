import { Schema } from "joi";
import { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { Entity } from "./entities/Entity";
import { Response } from "./Response";
import { IncomingMessage } from "http";
import { Session } from "next-auth";

export enum Status {
    OK = 200,
    CREATED = 201,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
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
    [Status.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
    [Status.NOT_IMPLEMENTED]: 'Not Yet Implemented',
};

type okCallback<T> = (x: T) => void;
type failCallback = (type: Status, message?: string) => void;

export interface Endpoint<Req, Res, QueryParams extends string> {
    /**
     * @default true
     */
    loginValidation?: boolean;

    schema?: Schema<Req>;

    handler: EndpointCallback<{
        query: { [_ in QueryParams]: string } & { [_ in string]?: string | undefined },
        body: Req,
        session?: Session | undefined
    }, Res>;
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
    GET: Endpoint<GetReq, GetRes, QueryParams>;
    POST: Endpoint<PostReq, PostRes, QueryParams>;
    PUT: Endpoint<PutReq, PutRes, QueryParams>;
    PATCH: Endpoint<PatchReq, PatchRes, QueryParams>;
    DELETE: Endpoint<DeleteReq, DeleteRes, QueryParams>;
}

type EntityEndpoints<E extends Entity<any, any>, QueryParams extends string> = {
    type: 'entity'
} & Partial<EndpointMap<
    QueryParams,
    undefined, E,
    unknown, unknown,
    E['attributes'], E,
    Partial<E['attributes']>, E,
    undefined, void
>>;

type EntityTypeEndpoints<E extends Entity<any, any>, QueryParams extends string> = {
    type: 'entityType'
} & Partial<EndpointMap<
    QueryParams,
    undefined, E[],
    E['attributes'], E,
    unknown, unknown,
    unknown, unknown,
    unknown, unknown
>>;

type SortableEntityTypeEndpoints<E extends Entity<any, any>, QueryParams extends string> = {
    type: 'entityType.sortable'
} & Partial<EndpointMap<
    QueryParams,
    undefined, E[],
    E['attributes'], E,
    unknown, unknown,
    { id: string, attributes?: Partial<E['attributes']> }[], E[],
    unknown, unknown
>>;

type EndpointResult<P extends string, Endpoints extends Partial<EndpointMap<any>>> = NextApiHandler<any> & {
    [Method in keyof Endpoints]: Endpoints[Method] extends Endpoint<any, any, P>
        ? Endpoints[Method] & { execute: ExecuteMethod<P, Endpoints[Method]> }
        : Endpoints[Method]
};

export function endpoint
    <P extends string, Endpoints extends EntityEndpoints<E, P>, E extends Entity<any, any>>
    (example: E | ((...args: any[]) => E), mandatoryParams: readonly P[], endpoints: Endpoints): EndpointResult<P, Endpoints>;

export function endpoint
    <P extends string, Endpoints extends EntityTypeEndpoints<E, P>, E extends Entity<any, any>>
    (example: E | ((...args: any[]) => E), mandatoryParams: readonly P[], endpoints: Endpoints): EndpointResult<P, Endpoints>;

export function endpoint
    <P extends string, Endpoints extends SortableEntityTypeEndpoints<E, P>, E extends Entity<any, any>>
    (example: E | ((...args: any[]) => E), mandatoryParams: readonly P[], endpoints: Endpoints): EndpointResult<P, Endpoints>;

export function endpoint
    <P extends string, Endpoints extends EndpointMap<P>>
    (options: any, mandatoryParams: readonly P[], endpoints: Endpoints): EndpointResult<P, Endpoints>;

export function endpoint<P extends string, Endpoints extends EndpointMap<P>>(_: any, mandatoryParams: readonly P[], endpoints: Endpoints) {
    async function handler(
        req: NextApiRequest,
        res: NextApiResponse<Response<any>>
    ) {
        function ok(result: any) {
            res.status(Status.OK).send({
                response: 'ok',
                data: result
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
                session = await getSession({ req }) ?? undefined;
                if (!session) {
                    return fail(Status.UNAUTHORIZED, 'Not logged in');
                }
            }

            const cleanedParams = {} as any;

            for (const param of Object.keys(req.query)) {
                const value = req.query[param];
                if (typeof value === 'string') {
                    cleanedParams[param] = value;
                }
            }

            for (const param of mandatoryParams) {
                if (!(param in cleanedParams)) {
                    return fail(Status.BAD_REQUEST, `Missing query or URL parameter ${param}`);
                }
            }

            let body: any;

            try {
                body = JSON.parse(req.body);
            }
            catch (e) {
                return fail(Status.BAD_REQUEST);
            }

            if (endpoint.schema) {
                const { value, error } = endpoint.schema.validate(req.body, {
                    abortEarly: false
                });

                if (error) {
                    return fail(Status.BAD_REQUEST, error.annotate(true));
                }

                body = value;
            }

            try {
                return endpoint.handler({ query: cleanedParams, body, session }, ok, fail);
            }
            catch (e) {
                return fail(Status.INTERNAL_SERVER_ERROR);
            }
        }
        else {
            return fail(Status.BAD_REQUEST, `${req.method} is not supported on this endpoint`);
        }
    }

    return Object.assign(handler, Object.fromEntries(Object.entries(endpoints).map(([name, obj]) => [name, { ...obj, execute }])));
}

type ExecuteMethod<P extends string, E extends Endpoint<any, any, P>> = (
    this: E,
    req: IncomingMessage,
    content: Omit<Parameters<E['handler']>[0], 'userId'>
) => Promise<Response<Parameters<Parameters<E['handler']>[1]>[0]>>;

function execute<E extends Endpoint<any, any, any>>(this: E, req: IncomingMessage, content: Omit<Parameters<E['handler']>[0], 'userId'>) {
    return new Promise(async resolve => {
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

        let session: Session | undefined;
    
        if (this.loginValidation !== false) {
            session = await getSession({ req }) ?? undefined;
            if (!session) {
                return fail(Status.UNAUTHORIZED, 'Not logged in');
            }
        }

        return this.handler({ ...content, session }, ok, fail);
    })

}