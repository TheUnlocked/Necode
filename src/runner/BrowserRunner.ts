// How to run code safely:
// 1. Create an iframe with the `sandbox` attribute. `allow-scripts` must be enabled, but NOTHING else.
// 2. Inside that iframe, launch a `Worker`.
// 3. Deliver the code into that worker, and eval it.
// 4. Retrieve response

import { proxy, windowEndpoint, wrap } from "comlink";
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
    private iframe?: HTMLIFrameElement;
    private exectutor?: (msg: MainToIframeMessage) => Promise<any>;
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
        this.iframe = document.createElement('iframe');
        this.iframe.setAttribute('sandbox', 'allow-scripts');
        this.iframe.style.display = 'none';

        this.iframe.srcdoc = /* html */ `<script type="module">
            import * as Comlink from "https://unpkg.com/comlink/dist/esm/comlink.mjs";
            Comlink.expose((req) => {
                switch (req.type) {
                    case 'getRunnerFunction': {
                        try {
                            const blob = new Blob([req.code], {type: 'application/javascript'});
                            const worker = new Worker(URL.createObjectURL(blob));
                            return Comlink.proxy(function(...args) {
                                return new Promise((resolve, reject) => {
                                    let timedOut = false;
                                    const timer = setTimeout(() => { worker.terminate(); timedOut = true; reject(); }, req.timeout);
                                    Comlink.wrap(worker)(...args).then(result => {
                                        if (!timedOut) {
                                            resolve(result);
                                        }
                                    }, error => {
                                        resolve(null);
                                    });
                                });
                            });
                        }
                        catch (e) {
                            // Some error with the code
                            return Comlink.proxy(() => {});
                        }
                    }
                }
            }, Comlink.windowEndpoint(window.parent));
        </script>`;
        
        return new Promise<void>(resolve => {
            this.iframe!.addEventListener('load', () => {
                this.exectutor = wrap<(msg: MainToIframeMessage) => any>(windowEndpoint(this.iframe!.contentWindow!));
                resolve();
            });
            document.body.append(this.iframe!);
        });
    }

    async runWithArguments(code: string, args: any[], timeout: number = 200) {
        if (this.exectutor) {
            const fn = await this.exectutor({
                type: 'getRunnerFunction',
                code,
                timeout
            });
            console.log(args);
            return fn(...args.map(proxy));
        }
    }

    /**
     * Shuts down the SecureRunner
     */
    shutdown() {
        this.iframe?.remove();
        this.isAlive = false;
    }
}
