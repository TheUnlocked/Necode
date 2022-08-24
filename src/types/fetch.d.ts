declare namespace globalThis {
    /**
     * Use {@link import('../util/fetch').default} instead.
     * If using the native fetch is important, `fetch<true>`.
     */
    function fetch<T = false>(...args: T extends true ? Parameters<Window['fetch']> : any): T extends true ? ReturnType<Window['fetch']> : never;
}
