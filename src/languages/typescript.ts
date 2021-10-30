import ILanguage from "./ILanguage";
import transformPreventInfiniteLoops from "./transformers/babel-plugin-transform-prevent-infinite-loops";
// @ts-ignore
import transformTypescript from "@babel/plugin-transform-typescript";
import { transformSync } from '@babel/core';

interface TypescriptOptions {
    entryPoint: string;
}

export class Typescript implements ILanguage<TypescriptOptions> {
    toRunnerCode(code: string, options: TypescriptOptions) {
        try {
            const result = transformSync(code, {
                plugins: [
                    transformTypescript,
                    transformPreventInfiniteLoops
                ]
            });
            return `const entry = new Function(${JSON.stringify(`${result!.code}\nreturn ${options.entryPoint};`)})();`;
        }
        catch (e) {
            // The code will throw some sort of syntax error anyways, so we'll let it throw the browser version.
            return code;
        }
    }
}