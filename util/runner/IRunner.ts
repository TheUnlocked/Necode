import { Result } from "../../languages/Language";

export interface IRunner {
    run(code: string): Promise<Result>;
}

export interface IRunnerProvider<TRunner extends IRunner = IRunner> {
    /** Requisition a runner. Any requisitioned runner must be released to avoid memory leaks and performance hits. */
    requisition(): Promise<TRunner>;
    /** Releases a requisitioned runner. After being released, a runner must not be used again. */
    release(runner: TRunner): Promise<void>;
    /** 
     * Use a runner for the duration of a callback. The runner given must not be used outside of the lifetime of the callback execution.
     * The callback must resolve to avoid memory leaks and performance hits.
     */
    use(callback: (runner: TRunner) => Promise<void>): Promise<void>;
}