export function $in<T>(field: string | number | symbol, obj: T): field is keyof T {
    return field in obj;
}
