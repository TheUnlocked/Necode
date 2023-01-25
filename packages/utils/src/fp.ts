export function compose2<A, B, C>(outer: (arg: B) => C, inner: (arg: A) => B) {
    return (x: A) => outer(inner(x));
}

export function compose<T>(...fns: ((arg: T) => T)[]) {
    return fns.reduce(compose2);
}

export function sequence<R = void>(...fns: (() => R)[]): () => R[];
export function sequence<T, R = void>(...fns: ((arg: T) => R)[]): (arg: T) => R[];
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

export function flip(b: boolean) {
    return !b;
}

export function make<T extends Function>(base: (cb: T) => void, action: T) {
    return () => base(action);
}

export function callWith<T extends (...args: any) => any>(...args: Parameters<T>) {
    return function(this: any, fn: T) {
        return fn.apply(this, args);
    } as (fn: T) => ReturnType<T>;
}

export function $const<T>(x: T) {
    return () => x;
}