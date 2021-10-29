import IMap from "./IMap";

/**
 * A bidirectional map data structure which enforces a 1-1 mapping.
 */
export default class Bimap<T1, T2> implements IMap<T1, T2> {
    private fdMap = new Map<T1, T2>();
    private bkMap = new Map<T2, T1>();

    get size() {
        return this.fdMap.size;
    }

    set(key: T1, value: T2) {
        this.deleteByKey(key);
        this.deleteByValue(value);
        this.fdMap.set(key, value);
        this.bkMap.set(value, key);
        return this;
    }

    /** Alias of {@link hasKey} */
    has(key: T1) { return this.hasKey(key); }
    hasKey(key: T1) { return this.fdMap.has(key); }
    hasValue(value: T2) { return this.bkMap.has(value); }

    /** Alias of {@link getByKey} */
    get(key: T1) { return this.getByKey(key); }
    getByKey(key: T1) { return this.fdMap.get(key); }
    getByValue(value: T2) { return this.bkMap.get(value); }

    /** Alias of {@link deleteByKey} */
    delete(key: T1) {
        return this.deleteByKey(key);
    }

    deleteByKey(key: T1) {
        const value = this.fdMap.get(key);
        if (value) {
            this.fdMap.delete(key);
            this.bkMap.delete(value);
            return true;
        }
        return false;
    }

    deleteByValue(value: T2) {
        const key = this.bkMap.get(value);
        if (key) {
            this.fdMap.delete(key);
            this.bkMap.delete(value);
            return true;
        }
        return false;
    }

    clear() {
        this.fdMap.clear();
        this.bkMap.clear();
    }

    [Symbol.iterator]() { return this.fdMap[Symbol.iterator](); }
    keys() { return this.fdMap.keys(); }
    values() { return this.bkMap.keys(); }
    entries() { return this.fdMap.entries(); }
    forEach<ThisArg>(callbackFn: (this: ThisArg | undefined, value: T2, key: T1, map: this) => void, thisArg?: ThisArg) {
        for (const [key, value] of this) {
            callbackFn.call(thisArg, value, key, this)
        }
    }
}