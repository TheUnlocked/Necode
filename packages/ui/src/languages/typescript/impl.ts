import RunnableLanguage from "../RunnableLanguage";
import transformPreventInfiniteLoops from "../transformers/babel-plugin-transform-prevent-infinite-loops";
// @ts-ignore
import transformTypescript from "@babel/plugin-transform-typescript";
import { FeatureOptionsOf } from "../LangaugeDescription";
import { transformSync } from '@babel/core';
import { typescriptDescription } from '.';

export default class TypescriptImpl implements RunnableLanguage<typeof typescriptDescription.features> {
    toRunnerCode(code: string, options: FeatureOptionsOf<typeof typescriptDescription>) {
        try {
            const result = transformSync(code, {
                plugins: [
                    transformTypescript,
                    ...options.babelPlugins ?? [],
                    transformPreventInfiniteLoops
                ]
            });

            if (options.global) {
                return result!.code!;
            }
            if (typeof options.entryPoint === 'string') {
                return `const entry = new Function(${JSON.stringify(`${result!.code}\nreturn ${options.entryPoint};`)})();`;
            }
            throw new Error('Typescript code must be generated in either global or entryPoint mode');
        }
        catch (e: any) {
            if (options.throwAllCompilerErrors) {
                throw e;
            }
            // The code will throw some sort of syntax error anyways, so we'll let it throw the browser version.
            return code;
        }
    }
}