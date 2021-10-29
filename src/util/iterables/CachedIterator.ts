import cachedIterable from "./cachedIterable";

@cachedIterable
export default class CachedIterator<T> implements Iterable<T> {
    constructor(private iterator: Iterator<T>) {}

    *[Symbol.iterator](): Iterator<T, any, undefined> {
        while (true) {
            const { done, value } = this.iterator.next();
            if (done) {
                return value;
            }
            yield value;
        }
    }
}