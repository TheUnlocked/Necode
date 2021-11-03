export function $in<T>(field: string | number | symbol, obj: T): field is keyof T {
    return field in obj;
}

export function isNotNull<T>(x: T): x is NonNullable<T> {
    return x != null;
}

export function typeAssert(condition: boolean): asserts condition { }
