import { IRunner, IRunnerProvider } from "./IRunner";

export class BrowserRunnerProvider implements IRunnerProvider<BrowserRunner> {
    async requisition(): Promise<BrowserRunner> {
        const runner = new BrowserRunner();
        await runner.start();
        return runner;
    }

    async release(runner: BrowserRunner): Promise<void> {
        runner.shutdown();
    }

    async use(callback: (runner: BrowserRunner) => Promise<void>): Promise<void> {
        const runner = await this.requisition();
        await callback(runner);
        await this.release(runner);
    }
}

export class BrowserRunner implements IRunner {
    wasStarted = false;
    isAlive = false;
    private code: string = "";
    private compiled: Function | undefined;
    private entryPoint: Function | undefined;

    async start() {
        if (this.wasStarted) {
            if (this.isAlive) {
                throw new Error(`Cannot start an already started runner`);
            }
            else {
                throw new Error(`Cannot re-start a dead runner, create a new instance instead`);
            }
        }
    }

    /**
     * 
     * @param code 
     * @throws
     */
    prepareCode(code: string | undefined) {
        this.entryPoint = undefined;
        if (code === undefined) {
            this.compiled = undefined;
        }
        else {
            this.compiled = new Function(`${code};return entry`);
        }
    }

    get isPrepared() {
        return this.compiled !== undefined;
    }

    /**
     * @param code 
     * @param args 
     * @param timeout 
     * @throws
     */
    async run(args: any[] = [], timeout: number = 200) {
        if (!this.compiled) {
            throw Error("Tried to run code without preparing it");
        }
        if (this.entryPoint) {
            return this.runHot(args, timeout);
        }
        return this.runCold(args, timeout);
    }

    private async runCold(args: any[], timeout: number) {
        this.entryPoint = this.compiled!();
        return this.runHot(args, timeout);
    }

    private async runHot(args: any[], timeout: number) {
        this.entryPoint!(...args);
    }

    /**
     * Shuts down the SecureRunner
     */
    shutdown() {
        this.isAlive = false;
    }
}
