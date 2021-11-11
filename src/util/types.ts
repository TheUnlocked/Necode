export type NewType<T, Name extends string | symbol> = Name extends string
    ? (T & { [_ in `__${Name}__`]: never }) | { [_ in `__${Name}__`]: never }
    : (T & { [_ in Name]: never }) | { [_ in Name]: never };

export type Nominal<T, Name extends string | symbol> = Name extends string
    ? (T & { [_ in `__${Name}__`]: never })
    : (T & { [_ in Name]: never });
