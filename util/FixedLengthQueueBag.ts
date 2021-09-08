export default class FixedLengthQueueBag<T> {
    private backingArray: T[] = [];

    constructor(public readonly size: number) {

    }

    add(val: T) {
        // slow but who cares for the sizes we're dealing with
        if (this.backingArray.length >= this.size) {
            this.backingArray.shift();
        }
        this.backingArray.push(val);
    }

    has(val: T) {
        return this.backingArray.includes(val);
    }

    clear() {
        this.backingArray = [];
    }
}