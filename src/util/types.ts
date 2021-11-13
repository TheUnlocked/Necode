export type NewType<T, Name extends string | symbol> = Name extends string
    ? (T & { [_ in `__${Name}__`]: never }) | { [_ in `__${Name}__`]: never }
    : (T & { [_ in Name]: never }) | { [_ in Name]: never };

export type Nominal<T, Name extends string | symbol> = Name extends string
    ? (T & { [_ in `__${Name}__`]: never })
    : (T & { [_ in Name]: never });

export type Explicit<T> = { [K in keyof T]: T[K] };

export type UndefinedIsOptional<T> = Explicit<{
    [Key in keyof T as T[Key] extends undefined ? Key : never]?: T[Key]
} & {
    [Key in keyof T as T[Key] extends undefined ? never : Key]: T[Key]
}>;

export type Awaitable<T> = T | PromiseLike<T>;