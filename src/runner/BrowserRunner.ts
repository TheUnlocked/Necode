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

type MainToIframeMessage = {
    type: 'getRunnerFunction',
    code: string,
    timeout: number
};

export class BrowserRunner implements IRunner {
    wasStarted = false;
    isAlive = false;

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

    async runWithArguments(code: string, args: any[], timeout: number = 200) {
        try {
            eval(`${code} entry(...args)`);
        }
        catch (e) {
            // Report error to user somehow
            // console.log(e)
        }
    }

    /**
     * Shuts down the SecureRunner
     */
    shutdown() {
        this.isAlive = false;
    }
}
