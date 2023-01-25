/**
 * 
 * @returns `n % m` if `n % m` is positive, `n % m + m` otherwise.
 */
export function mod(n: number, m: number) {
    return ((n % m) + m) % m;
}