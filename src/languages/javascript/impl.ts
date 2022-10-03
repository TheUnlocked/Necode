import { transformSync } from '@babel/core';
import { FeatureOptionsOf } from '../LangaugeDescription';
import RunnableLanguage from '../RunnableLanguage';
import babelPluginTransformPreventInfiniteLoops from '../transformers/babel-plugin-transform-prevent-infinite-loops';
import { javascriptDescription } from '.';

export default class JavascriptImpl implements RunnableLanguage<typeof javascriptDescription.features> {
    toRunnerCode(code: string, options: FeatureOptionsOf<typeof javascriptDescription>) {
        try {
            const result = transformSync(code, {
                plugins: [
                    ...options.babelPlugins ?? [],
                    babelPluginTransformPreventInfiniteLoops
                ]
            });
            if (options.global) {
                return result!.code!;
            }
            if (typeof options.entryPoint === 'string') {
                return `const entry = new Function(${JSON.stringify(`${result!.code}\nreturn ${options.entryPoint};`)})();`;
            }
            throw new Error('Javascript code must be generated in either global or entryPoint mode');
        }
        catch (e: any) {
            // The code will throw some sort of syntax error anyways, so we'll let it throw the browser version.
            return code;
        }
    }
}