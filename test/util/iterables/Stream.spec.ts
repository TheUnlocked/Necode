import { expect } from "chai";
import { stream } from "../../../src/util/iterables/Stream";

function* countUp(i = 0) {
    while (true) {
        yield i++;
    }
}

describe("Stream", () => {
    it("should be reusable", () => {
        const s = stream([1, 2, 3]);
        const _ = [...s];
        expect([...s]).to.deep.equal([1, 2, 3]);
    });

    describe("take", () => {
        it("should take 5 elements from an infinite iterable", () => {
            expect([...stream(countUp()).take(5)]).to.deep.equal([0, 1, 2, 3, 4]);
        });

        it("should take 3 elements when trying to take 5 elements from a 3-element array", () => {
            expect([...stream([1, 2, 3]).take(5)]).to.deep.equal([1, 2, 3]);
        });
    });

    describe("map", () => {
        it("should be able to map the natural numbers into the even natural numbers", () => {
            expect([...stream(countUp()).map(x => x*2).take(5)]).to.deep.equal([0, 2, 4, 6, 8]);
        });
    });

    describe("filter", () => {
        it("should be able to filter the natural numbers into the even natural numbers", () => {
            expect([...stream(countUp()).filter(x => x % 2 === 0).take(5)]).to.deep.equal([0, 2, 4, 6, 8]);
        });
    });

    describe("partition", () => {
        it("should be able to partition based on a simple predicate", () => {
            expect([...stream([
                [1, 'a'],
                [1, 'b'],
                [1, 'c'],
                [2, 'a'],
                [2, 'd'],
                [4, 'f']
            ] as const).partition(v => v[0])]).to.deep.equal([
                [1, [[1, 'a'], [1, 'b'], [1, 'c']]],
                [2, [[2, 'a'], [2, 'd']]],
                [4, [[4, 'f']]]
            ]);
        });
    });
});