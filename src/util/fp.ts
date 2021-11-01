export function compose2<A, B, C>(outer: (arg: B) => C, inner: (arg: A) => B) {
    return (x: A) => outer(inner(x));
}

export function compose<T>(...fns: ((arg: T) => T)[]) {
    return fns.reduce(compose2);
}

export function sequence<T, R = void>(...fns: ((arg: T) => R)[]): (arg: T) => R[] {
    return x => {
        const result = [] as R[];
        for (const fn of fns) {
            result.push(fn(x));
        }
        return result;
    };
}

export function $void(fn: (...args: void[]) => void): () => void {
    return fn;
}