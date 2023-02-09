export default interface IMap<K, V> {
    clear(): void;

    delete(key: K): boolean;

    forEach<ThisArg>(callbackfn: (this: ThisArg | undefined, value: V, key: K) => void, thisArg?: ThisArg): void;
    get(key: K): V | undefined;
    has(key: K): boolean;

    set(key: K, value: V): this;
    readonly size: number;
}