export class CodeRunner {
    wasStarted = false;
    isAlive = false;
    private compiled: Function | undefined;
    private entryPoint: Function | undefined;

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
}
