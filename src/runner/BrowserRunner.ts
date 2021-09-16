// How to run code safely:
// 1. Create an iframe with the `sandbox` attribute. `allow-scripts` must be enabled, but NOTHING else.
// 2. Inside that iframe, launch a `Worker`.
// 3. Deliver the code into that worker, and eval it.
// 4. Retrieve response

import { IRunner, IRunnerProvider } from "./IRunner";
import { AnyMessage, MainToIFrameEventMap, MainToIframeMessage, Message, IframeToMainEventMap, IframeToMainMessage } from "./MessageTypes";

export interface SecureRunnerOptions {
    /** Polling frequency in milliseconds. Default: 500 */
    pollFrequency: number;
}

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
    private options: SecureRunnerOptions;
    private iframe!: HTMLIFrameElement;
    wasStarted = false;
    isAlive = false;
    isResponding = false;

    /**
     * 
     * @param options An options object. Options cannot be changed after the SecureRunner is constructed.
     */
    constructor(options: Partial<SecureRunnerOptions> = {}) {
        this.options = {
            pollFrequency: 500,
            ...options
        };
    }

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

        this.iframe.srcdoc = `<!DOCTYPE html>
        <html>
            <head>
                <script type="module">
                    import * as Comlink from "https://unpkg.com/comlink/dist/esm/comlink.mjs";
                    let exposed = null;
                    ${iframeMessageHandler.toString()}
                    iframeMessageHandler();
                    Comlink.expose(() => exposed);
                </script>
            </head>
        </html>`;
        
        return new Promise<void>(resolve => {
            this.iframe.addEventListener('load', () => {
                this.beginListening();
                resolve();
            });
            document.body.append(this.iframe);
        });
    }

    private postMessage<Event extends keyof MainToIFrameEventMap>(order: Omit<MainToIframeMessage<Event>, 'origin'>) {
        this.iframe.postMessage({ ...order, } as MainToIframeMessage<Event>, window.location.origin);
    }

    private messageListener!: (ev: MessageEvent<any>) => any;
    private pollingInterval!: number;
    private respondedSinceLastInterval = false;

    private beginListening() {
        this.iframe.message('message', this.messageListener = e => {
            const message = e.data as AnyMessage;
            if (message.origin === 'worker') {
                switch (message.type) {
                    case 'pong':
                        this.isResponding = true;
                        this.respondedSinceLastInterval = true;
                        break;
                }
            }
        });

        this.pollingInterval = setInterval(() => {
            if (!this.respondedSinceLastInterval) {
                this.isResponding = false;
            }
            this.respondedSinceLastInterval = false;
            this.postMessage({ type: 'ping' });
        }, this.options.pollFrequency) as any as number;
    }

    async load(code: string) {
        this.postMessage()
    }

    /**
     * Shuts down the SecureRunner
     */
    shutdown() {
        clearInterval(this.pollingInterval);
        this.iframe.contentWindow!.removeEventListener('message', this.messageListener);
        this.iframe.remove();
        this.isAlive = false;
    }
}

declare let exposed: any;

function iframeMessageHandler() {
    function postMessage<Type extends keyof IframeToMainEventMap>(order: Omit<IframeToMainMessage<Type>, 'origin'>) {
        window.postMessage({ ...order, origin: 'worker' } as IframeToMainMessage<Type>, window.location.origin);
    }

    window.addEventListener('message', e => {
        const message: AnyMessage = e.data;
        if (message.origin === 'iframe') {
            switch (message.type) {
                case 'ping':
                    postMessage({ type: 'pong' });
                    break;
            }
        }
    });
}