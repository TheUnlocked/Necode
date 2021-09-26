import ILanguage from "./ILanguage";
import transformPreventInfiniteLoops from "./transformers/babel-plugin-transform-prevent-infinite-loops";
import { transformSync } from '@babel/core';

interface JavascriptOptions {
    entryPoint: string;
}

export class Javascript implements ILanguage<JavascriptOptions> {
    toRunnerCode(code: string, options: JavascriptOptions) {
        try {
            const result = transformSync(code, {
                plugins: [transformPreventInfiniteLoops]
            });
            return `const entry = new Function(${JSON.stringify(`${result!.code}\nreturn ${options.entryPoint};`)})();`;
        }
        catch (e) {
            // The code will throw some sort of syntax error anyways, so we'll let it throw the browser version.
            return code;
        }
    }
}