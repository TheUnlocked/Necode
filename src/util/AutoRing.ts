import { mod } from "./math";
import { None, Option, Some } from "./Option";

export interface AutoRingOptions<T> {
    linkHandler?: (from: T, to: T) => void,
    unlinkHandler?: (from: T, to: T) => void
}

export class AutoRingValidationError<T = any> extends Error {
    constructor(
        message: string,
        public table: Map<T, [prev: T, next: T]>,
        public anchor: Option<T>
    ) {
        super(message);
        this.name = 'AutoRingValidationError';
    }
}

export default class AutoRing<T> {
    private linkTable = new Map<T, [prev: T, next: T]>();
    private anchor: Option<T> = None;

    public linkHandler?: (from: T, to: T) => void;
    public unlinkHandler?: (from: T, to: T) => void;

    constructor(
        items?: Iterable<T>,
        options?: AutoRingOptions<T>
    ) {
        this.linkHandler = options?.linkHandler;
        this.unlinkHandler = options?.unlinkHandler;

        this.add = this.add.bind(this);
        this.remove = this.remove.bind(this);
        
        if (items) {
            const itemsArr = [...items];
            if (itemsArr.length > 0) {
                itemsArr.forEach((item, i) => {
                    const before = itemsArr[mod(i - 1, itemsArr.length)];
                    const after = itemsArr[mod(i + 1, itemsArr.length)];
                    this.linkTable.set(item, [before, after]);
                    this.linkHandler?.(item, after);
                });
                this.anchor = Some(itemsArr[itemsArr.length - 1]);
            }
        }
    }

    private validate() {
        const expectedSize = this.linkTable.size;
        if (this.anchor.exists) {
            let size = 0;
            let next = this.anchor.value;
            do {
                if (size > expectedSize + 50) {
                    throw new AutoRingValidationError(
                        `Number of discovered elements exceeded ${expectedSize + 50} which may indicate an unintended cycle`,
                        this.linkTable,
                        this.anchor
                    );
                }

                const nextArr = this.linkTable.get(next);
                if (!nextArr) {
                    throw new AutoRingValidationError(
                        `${next} has no mapping`,
                        this.linkTable,
                        this.anchor
                    );
                }
                const toBeNext = nextArr[1];
                const nexterArr = this.linkTable.get(toBeNext);
                if (!nexterArr) {
                    throw new AutoRingValidationError(
                        `${toBeNext} has no mapping`,
                        this.linkTable,
                        this.anchor
                    );
                }
                if (nexterArr[0] !== next) {
                    throw new AutoRingValidationError(
                        `Before of ${toBeNext} expected to be ${next} but was ${nexterArr[0]}`,
                        this.linkTable,
                        this.anchor
                    );
                }

                next = toBeNext;
                size++;
            } while (next !== this.anchor.value);

            if (size !== expectedSize) {
                throw new AutoRingValidationError(
                    `${expectedSize} did not match number of discovered elements ${size}`,
                    this.linkTable,
                    this.anchor
                );
            }
        }
        else {
            if (expectedSize !== 0) {
                throw new AutoRingValidationError(
                    `${expectedSize} did not match number of discovered elements 0`,
                    this.linkTable,
                    this.anchor
                );
            }
        }
    }

    /**
     * @returns false if `obj` is already in the ring, true if it is successfully added.
     */
    add(obj: T) {
        if (process.env.NODE_ENV !== 'production') {
            this.validate();
        }
        
        if (this.linkTable.has(obj)) {
            return false;
        }
        
        if (this.anchor.exists) {
            const oldAnchor = this.anchor.value;
            if (this.linkTable.size === 1) {
                this.linkTable.set(oldAnchor, [obj, obj]);
                this.linkTable.set(obj, [oldAnchor, oldAnchor]);
                this.unlinkHandler?.(oldAnchor, oldAnchor);
                this.linkHandler?.(oldAnchor, obj);
                this.linkHandler?.(obj, oldAnchor);
            }
            else {
                const [beforeOldAnchor, afterOldAnchor] = this.linkTable.get(oldAnchor)!;
                this.linkTable.set(oldAnchor, [beforeOldAnchor, obj]);
                this.linkTable.set(obj, [oldAnchor, afterOldAnchor]);
                this.linkTable.get(afterOldAnchor)![0] = obj;
                this.unlinkHandler?.(oldAnchor, afterOldAnchor);
                this.linkHandler?.(oldAnchor, obj);
                this.linkHandler?.(obj, afterOldAnchor);
            }
        }
        else {
            this.linkTable.set(obj, [obj, obj]);
            this.linkHandler?.(obj, obj);
        }
        this.anchor = Some(obj);
        return true;
    }

    /**
     * @returns true if `obj` was successfully removed, false if it was not in the ring.
     */
    remove(obj: T) {
        if (process.env.NODE_ENV !== 'production') {
            this.validate();
        }

        if (!this.linkTable.has(obj)) {
            return false;
        }
        
        if (this.linkTable.size === 1) {
            this.linkTable.delete(obj);
            this.unlinkHandler?.(obj, obj);
            this.anchor = None;
        }
        else if (this.linkTable.size === 2) {
            const [other] = this.linkTable.get(obj)!;
            this.linkTable.delete(obj);
            this.linkTable.set(other, [other, other]);
            this.unlinkHandler?.(other, obj);
            this.unlinkHandler?.(obj, other);
            this.linkHandler?.(other, other);
            this.anchor = Some(other);
        }
        else {
            const [before, after] = this.linkTable.get(obj)!;
            const [beforeBefore] = this.linkTable.get(before)!;
            const [, afterAfter] = this.linkTable.get(after)!;
            this.linkTable.delete(obj);
            this.linkTable.set(before, [beforeBefore, after]);
            this.linkTable.set(after, [before, afterAfter]);
            this.unlinkHandler?.(before, obj);
            this.unlinkHandler?.(obj, after);
            this.linkHandler?.(before, after);
    
            if (obj === this.anchor) {
                this.anchor = Some(after);
            }
        }
        return true;
    }
}