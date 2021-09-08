// How to run code safely:
// 1. Create an iframe with the `sandbox` attribute. `allow-scripts` must be enabled, but NOTHING else.
// 2. Inside that iframe, launch a `Worker`.
// 3. Deliver the code into that worker, and eval it.
// 4. Retrieve response

import { IRunner, IRunnerProvider } from "./IRunner";

export interface SecureRunnerOptions {
    /** Polling frequency in milliseconds. Default: 500 */
    pollFrequency: number;
}

interface MessageMap {
    ping: never;
}

type Message<Type extends keyof MessageMap> = MessageMap[Type] extends never ? {
    type: Type
    origin: 'main';
} : {
    type: Type;
    body: MessageMap[Type];
    origin: 'main';
}

type AnyMessage = Message<keyof MessageMap>;

interface RecvMessageMap {
    pong: never;
}

type RecvMessage<Type extends keyof RecvMessageMap> = RecvMessageMap[Type] extends never ? {
    type: Type
    origin: 'runner';
} : {
    type: Type;
    body: RecvMessageMap[Type];
    origin: 'runner';
}

type AnyRecvMessage = RecvMessage<keyof RecvMessageMap>;

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
        return new Promise<void>(resolve => {
            this.iframe.addEventListener('load', () => {
                const messageScript = document.createElement('script');
                messageScript.innerHTML = `${iframeMessageHandler.toString()}\niframeMessageHandler();`;
                messageScript.addEventListener('load', () => {
                    this.beginListening();
                    resolve();
                });
                this.iframe.contentDocument!.head.append(messageScript);
            });
            document.body.append(this.iframe);
        });
    }

    private postMessage<Type extends keyof MessageMap>(order: Omit<Message<Type>, 'origin'>) {
        this.iframe.contentWindow!.postMessage({ ...order, origin: 'main' } as Message<Type>, window.location.origin);
    }

    private messageListener!: (ev: MessageEvent<any>) => any;
    private pollingInterval!: number;
    private respondedSinceLastInterval = false;

    private beginListening() {
        this.iframe.contentWindow!.addEventListener('message', this.messageListener = e => {
            const message = e as AnyRecvMessage;
            if (message.origin === 'runner') {
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

    run(code: string) {
        return null!;
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

function iframeMessageHandler() {
    function postMessage<Type extends keyof RecvMessageMap>(order: Omit<RecvMessage<Type>, 'origin'>) {
        window.postMessage({ ...order, origin: 'runner' } as RecvMessage<Type>, window.location.origin);
    }

    window.addEventListener('message', e => {
        const message: AnyMessage = e.data;
        if (message.origin === 'main') {
            switch (message.type) {
                case 'ping':
                    postMessage({ type: 'pong' });
                    break;
            }
        }
    });
}