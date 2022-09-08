type Composition
    = [type: 'map',    callbackfn: (value: any, currentIndex: number) => any, thisArg?: any]
    | [type: 'filter', predicate:  (value: any, currentIndex: number) => boolean, thisArg?: any]
    ;

// @cachedIterable
export class Stream<T> implements Iterable<T> {
    private constructor(private baseIterable: Iterable<T>, private compositions = [] as Composition[]) {
        
    }

    toArray() {
        return [...this];
    }

    *[Symbol.iterator](): Iterator<T, any, undefined> {
        let i = -1;
        const iter = this.baseIterable[Symbol.iterator]();
        iterableLoop:
        for (let result = iter.next(); !result.done; result = iter.next()) {
            i++;
            let value = result.value;
            for (let compIndex = 0; compIndex < this.compositions.length; compIndex++) {
                const composition = this.compositions[compIndex];

                if (composition[0] === 'map') {
                    value = composition[1].call(composition[2], value, i);
                }
                else if (composition[0] === 'filter') {
                    if (!composition[1].call(composition[2], value, i)) {
                        continue iterableLoop;
                    }
                }
                else {
                    throw new Error(`Invalid operation in stream: ${composition[0]}, expected "map" or "filter"`);
                }
            }
            yield value;
        }
    }

    static create<T>(x: Iterable<T>) {
        return new Stream(x);
    }

    map<U>(callbackfn: (value: T, currentIndex: number) => U, thisArg?: any) {
        return new Stream(this.baseIterable, this.compositions.concat([['map', callbackfn, thisArg]])) as unknown as Stream<U>;
    }

    filter<S extends T>(predicate: (value: T, currentIndex: number) => value is S, thisArg?: any): Stream<S>;
    filter(predicate: (value: T, currentIndex: number) => boolean, thisArg?: any): Stream<T>;
    filter(predicate: (value: T, currentIndex: number) => boolean, thisArg?: any) {
        return new Stream(this.baseIterable, this.compositions.concat([['filter', predicate, thisArg]]));
    }

    takeWhile(predicate: (value: T, currentIndex: number) => boolean, thisArg?: any) {
        const self = this;
        return stream((function*() {
            let i = 0;
            for (const item of self) {
                if (!predicate.call(thisArg, item, i++)) {
                    break;
                }
                yield item;
            }
        })());
    }

    skipWhile<S extends T>(predicate: (value: T, currentIndex: number) => value is S, thisArg?: any): Stream<S>;
    skipWhile(predicate: (value: T, currentIndex: number) => boolean, thisArg?: any): Stream<T>;
    skipWhile(predicate: (value: T, currentIndex: number) => boolean, thisArg?: any) {
        const self = this;
        return stream((function*() {
            let i = 0;
            let skipping = true;
            for (const item of self) {
                if (skipping) {
                    if (predicate.call(thisArg, item, i++)) {
                        continue;
                    }
                    skipping = false;
                }
                yield item;
            }
        })());
    }

    take(n: number) {
        return this.takeWhile((_, i) => i < n);
    }

    skip(n: number) {
        return this.skipWhile((_, i) => i < n);
    }

    reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number) => T, thisArg?: any): T;
    reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number) => T, initialValue: T, thisArg?: any): T;
    reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number) => U, initialValue: U, thisArg?: any): U;
    reduce<U>(callbackfn: (previousValue: any, currentValue: any, currentIndex: number) => U, initialValue?: any, thisArg?: any): any {
        let result = initialValue;
        let i = 0;
        for (const val of this) {
            if (i === 0 && result === undefined) {
                result = val;
            }
            else {
                result = callbackfn.call(thisArg, result, val, i++);
            }
        }
        return result;
    }

    find<S extends T>(predicate: (this: void, value: T, index: number) => value is S, thisArg?: any): S | undefined;
    find(predicate: (value: T, index: number) => unknown, thisArg?: any): T | undefined;
    find(predicate: (value: T, index: number) => unknown, thisArg?: any): T | undefined {
        let i = 0;
        for (const val of this) {
            if (predicate.call(thisArg, val, i++)) {
                return val;
            }
        }
    }

    findIndex(predicate: (value: T, index: number) => unknown, thisArg?: any): number {
        let i = -1;
        for (const val of this) {
            if (predicate.call(thisArg, val, ++i)) {
                return i;
            }
        }
        return -1;
    }

    every<S extends T>(predicate: (value: T, index: number) => value is S, thisArg?: any): this is Stream<S>;
    every(predicate: (value: T, index: number) => unknown, thisArg?: any): boolean;
    every(predicate: (value: T, index: number) => unknown, thisArg?: any): boolean {
        for (const _ of this.takeWhile((v, i) => !predicate.call(thisArg, v, i), thisArg)) {
            return false;
        }
        return true;
    }
        
    some(predicate: (value: T, index: number) => unknown, thisArg?: any): boolean {
        for (const _ of this.skipWhile((v, i) => !predicate.call(thisArg, v, i), thisArg)) {
            return false;
        }
        return true;
    }
        
    forEach(callbackfn: (value: T, index: number) => void, thisArg?: any): void {
        let i = 0;
        for (const val of this) {
            callbackfn.call(thisArg, val, i++);
        }
    }

    zip<U>(other: Iterable<U>): Stream<[T, U]>;
    zip<U, V>(other: Iterable<U>, callbackfn: (value1: T, value2: U, index: number) => V, thisArg?: any): Stream<V>;
    zip<U, V>(other: Iterable<U>, callbackfn?: (value1: T, value2: U, index: number) => V, thisArg?: any): Stream<V | [T, U]> {
        const self = this;
        return stream((function*() {
            const myIterator = self[Symbol.iterator]();
            const otherIterator = other[Symbol.iterator]();
            
            let i = 0;
            while (true) {
                const { value: value1, done: done1 } = myIterator.next();
                const { value: value2, done: done2 } = otherIterator.next();
                if (done1 || done2) {
                    break;
                }
                if (callbackfn) {
                    yield callbackfn.call(thisArg, value1, value2, i);
                }
                else {
                    yield [value1, value2] as [T, U];
                }
            }
        })());
    }

    concat(other: Iterable<T>): Stream<T>;
    concat<U>(other: Iterable<U>): Stream<T | U>;
    concat<U>(other: Iterable<U>): Stream<T | U> {
        const self = this;
        return stream((function*() {
            yield* self;
            yield* other;
        })());
    }

    first() {
        return this.take(1).toArray()[0];
    }

    partition<U>(partitioner: (value: T, currentIndex: number) => U, thisArg?: any): Stream<[shared: U, values: T[]]> {
        const partitions = new Map<U, T[]>();

        let i = 0;
        for (const e of this) {
            const key = partitioner.call(thisArg, e, i++);
            const currentSet = partitions.get(key);
            if (!currentSet) {
                partitions.set(key, [e]);
            }
            else {
                currentSet.push(e);
            }
        }

        return stream(partitions.entries());
    }
}

export function stream<T>(x: Iterable<T>) {
    return Stream.create(x);
}