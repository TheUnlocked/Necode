export function $in<T extends {}>(field: string | number | symbol, obj: T): field is keyof T {
    return field in obj;
}

export function isNotNull<T>(x: T): x is NonNullable<T> {
    return x != null;
}

export function includes<A extends readonly any[], T>(arr: A, x: A[number] extends T ? T : never): x is A[number] {
    return arr.includes(x);
}

export function typeAssert(condition: boolean): asserts condition {
    if (process.env.NODE_ENV === 'development') {
        if (!condition) {
            throw new Error("Asserted condition failed");
        }
    }
}

export function singleArg<T extends (arg: A, ...rest: undefined[]) => R, A, R>(f: T) {
    return (arg: A) => f(arg);
}