export type NewType<T, Name extends string | symbol> = Name extends string
    ? (T & { [_ in `__${Name}__`]: never }) | { [_ in `__${Name}__`]: never }
    : (T & { [_ in Name]: never }) | { [_ in Name]: never };

export type ImplicitNewType<T, Name extends string | symbol> = Name extends string
    ? T | { [_ in `__${Name}__`]: never }
    : T | { [_ in Name]: never };

export type Nominal<T, Name extends string | symbol> = Name extends string
    ? T & { [_ in `__${Name}__`]: never }
    : T & { [_ in Name]: never };

export type Explicit<T> = { [K in keyof T]: T[K] };

export type UndefinedIsOptional<T> = Explicit<{
    [Key in keyof T as T[Key] extends undefined ? Key : never]?: T[Key]
} & {
    [Key in keyof T as T[Key] extends undefined ? never : Key]: T[Key]
}>;

export type Awaitable<T> = T | PromiseLike<T>;

export type IfAny<T, A, B> = Omit<{ a: any, b: any }, T extends never ? 'a' : 'b'> extends { a: any } ? B : A;

export type If<C, T, E = {}> = C extends true ? T : E;

export type NonStrictDisjunction<A, B>
    // The simple implementation doesn't work because of https://github.com/microsoft/TypeScript/issues/46976
    // = (A & Partial<B>) | (B & Partial<A>);
    = {
        [Key in keyof A | keyof B]:
            Key extends keyof A
                ? Key extends keyof B
                    ? A[Key] & B[Key]
                    : A[Key] | undefined
                : Key extends keyof B
                    ? B[Key] | undefined
                    : undefined
    };

export type Importable<T> = () => Promise<T>;

export type Mutable<T> = { -readonly [P in keyof T]: T[P] extends ReadonlyArray<infer U> ? U[] : T[P] };

export type DisposeFn = () => void;

/** Courtesy of https://stackoverflow.com/a/50375286/4937286 */
export type UnionToIntersection<U> = 
    (U extends any ? (k: U)=>void : never) extends ((k: infer I)=>void) ? I : never;

/** https://stackoverflow.com/a/52490977/4937286 */
export type Tuple<T, N extends number> = N extends N ? number extends N ? T[] : _TupleOf<T, N, []> : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R['length'] extends N ? R : _TupleOf<T, N, [T, ...R]>;
