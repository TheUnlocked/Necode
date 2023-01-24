type Creator<T> = { new(...args: any[]): T } | { prototype: any, create(...args: any[]): T };

type CreatedType<T extends Creator<any>> =
    T extends { create(...args: any[]): infer U }
        ? U
        : T extends { new(...args: any[]): infer U }
        ? U
        : never;

const cachedIterable = <T, U extends Creator<Iterable<T>>>($class: U) => {
    const instanceMap = new WeakMap<CreatedType<U>, {
        iterator: Iterator<T>;
        cache: T[];
        done: boolean;
    }>();

    const originalIterator = $class.prototype[Symbol.iterator];

    $class.prototype[Symbol.iterator] = function*(this: CreatedType<U>) {
        if (!instanceMap.has(this)) {
            instanceMap.set(this, {
                iterator: originalIterator.call(this),
                cache: [],
                done: false
            });
        }

        const self = instanceMap.get(this)!;
        
        if (self.done) {
            yield* self.cache;
        }
        
        let i = 0;
        while (true) {
            if (i < self.cache.length) {
                yield self.cache[i];
            }
            else {
                const { done, value } = self.iterator.next();
                if (done) {
                    self.done = true;
                    return value;
                }
                self.cache.push(value);
                yield value;
            }
            i++;
        }
    };
};

export default cachedIterable;