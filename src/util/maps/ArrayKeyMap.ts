import IMap from "./IMap";

export class ArrayKeyMap<Key extends ReadonlyArray<any>, Value> implements IMap<Key, Value> {
    private static VALUE_AT_NODE = Symbol('ArrayKeyMap.valueAtNode');
    private root = new Map();

    size = 0;
    private nodes = 1;
    private emptyNodes = 0;
    private EMPTY_NODE_RATIO = 1/3;

    clear(): void {
        this.root = new Map();
        this.size = 0;
        this.nodes = 1;
        this.emptyNodes = 0;
    }

    private findNode(key: Key) {
        let node = this.root;
        for (const elt of key) {
            if (node.has(elt)) {
                node = node.get(elt);
            }
            else {
                const newNode = new Map();
                node.set(elt, newNode);
                this.nodes++;
                node = newNode;
            }
        }
        return node;
    }

    set(key: Key, value: Value): this {
        const node = this.findNode(key);
        if (node.size === 0) {
            this.emptyNodes--;
        }
        node.set(ArrayKeyMap.VALUE_AT_NODE, value);
        return this;
    }

    delete(key: Key): boolean {
        const node = this.findNode(key);
        if (node.has(ArrayKeyMap.VALUE_AT_NODE)) {
            node.delete(ArrayKeyMap.VALUE_AT_NODE);
            if (node.size === 0) {
                this.emptyNodes++;
                this.reformatIfNeeded();
            }
            return true;
        }
        return false;
    }

    private reformatIfNeeded() {
        if (this.emptyNodes > this.nodes * this.EMPTY_NODE_RATIO) {
            this.reformat();
        }
    }

    reformat() {
        // rebuild map to remove all empty nodes
    }

    get(key: Key): Value | undefined {
        return this.findNode(key).get(ArrayKeyMap.VALUE_AT_NODE);
    }

    has(key: Key): boolean {
        return this.findNode(key).has(ArrayKeyMap.VALUE_AT_NODE);
    }

    forEach<ThisArg>(callbackfn: (this: ThisArg | undefined, value: Value, key: Key, map: this) => void, thisArg?: ThisArg): void {
        const rec = (keySoFar: any[], node: Map<any, any>) => {
            for (const [keyPart, val] of node.entries()) {
                if (keyPart === ArrayKeyMap.VALUE_AT_NODE) {
                    callbackfn.call(thisArg, val, keySoFar.concat([keyPart]) as unknown as Key, this);
                }
                else {
                    rec(keySoFar.concat([keyPart]), val);
                }
            }
        };
        rec([], this.root);
    }
}