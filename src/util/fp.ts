export function compose2<A, B, C>(outer: (arg: B) => C, inner: (arg: A) => B) {
    return (x: A) => outer(inner(x));
}

export function compose<T>(...fns: ((arg: T) => T)[]) {
    return fns.reduce(compose2);
}