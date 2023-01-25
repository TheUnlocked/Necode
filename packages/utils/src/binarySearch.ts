import { clamp } from 'lodash';

export interface BinarySearchOptions {
    guess?: number;
}

/**
 * @param arr 
 * @param compareFn A function which returns
 *      = 0 if this is the target element
 *      < 0 if the target element is before this one
 *      > 0 if the target element is after this one
 */
export function binarySearchIndex<T>(arr: readonly T[], compareFn: (obj: T) => number, { guess }: BinarySearchOptions = {}) {
    if (arr.length === 0) {
        return;
    }
    
    let low = 0;
    let high = arr.length - 1;
    let span = high;
    let index = guess ? clamp(Math.floor(guess), 0, arr.length - 1) : Math.floor(high / 2 + low);
    while (span >= 0) {
        const result = compareFn(arr[index]);
        if (result === 0) {
            return index;
        }
        else if (result > 0) {
            low = index + 1;
        }
        else {
            high = index - 1;
        }
        span = high - low;
        index = Math.floor(span / 2 + low);
    }
}