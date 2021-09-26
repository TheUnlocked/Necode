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

    async start() {
        if (this.wasStarted) {
            if (this.isAlive) {
                throw new Error(`Cannot start an already started SecureRunner`);
            }
            else {
                throw new Error(`Cannot re-start a dead SecureRunner, create a new instance instead`);
            }
        }
    }

    /**
     * 
     * @param code 
     * @throws
     */
    prepareCode(code: string | undefined) {
        if (code === undefined) {
            this.compiled = undefined;
        }
        else {
            console.log(`${code}\nentry(...arguments)`)
            this.compiled = new Function(`${code}\nentry(...arguments)`);
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
        return this.compiled(...args);
    }

    /**
     * Shuts down the SecureRunner
     */
    shutdown() {
        this.isAlive = false;
    }
}
