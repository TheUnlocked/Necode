declare namespace globalThis {
    /**
     * @deprecated Use {@link import('../util/fetch').default} instead.
     * If using the native fetch is important, use {@link import('../util/fetch').nativeFetch}.
     */
    function fetch(...args: any): never;
}
