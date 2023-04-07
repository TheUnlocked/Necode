export function neverResolve(): Promise<never> {
    return new Promise(() => {});
}
