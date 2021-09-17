import ILanguage from "./ILanguage";
import transformPreventInfiniteLoops from "../languages/trasnformers/babel-plugin-transform-prevent-infinite-loops";
import * as Babel from '@babel/standalone';

Babel.registerPlugin("prevent-infinite-loops", transformPreventInfiniteLoops);

interface JavascriptOptions {
    entryPoint: string;
}

export class Javascript implements ILanguage<JavascriptOptions> {
    toRunnerCode(code: string, options: JavascriptOptions) {
        try {
            const result = Babel.transform(code, {
                plugins: ["prevent-infinite-loops"]
            });
            return `const entry = new Function(${JSON.stringify(`${result.code};return ${options.entryPoint};`)})();`;
        }
        catch (e) {
            return `throw new Error()`;
        }
    }
}