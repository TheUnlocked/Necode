export default function asArray<T>(x: T | T[]) {
    if (x instanceof Array) {
        return x;
    }
    return [x];
}