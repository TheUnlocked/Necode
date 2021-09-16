import ILanguage from "./ILanguage";

interface JavascriptOptions {
    entryPoint: string;
}

export class Javascript implements ILanguage<JavascriptOptions> {
    toRunnerCode(code: string, options: JavascriptOptions) {
        // Note: Find way to do this better than loading from unpkg
        return `
        (() => {
            importScripts("https://unpkg.com/comlink/dist/umd/comlink.js");
            Comlink.expose(new Function(${JSON.stringify(`${code}; return ${options.entryPoint};`)})());
        })();
        `;
    }
}