import RunnableLanguage from "./RunnableLanguage";
import transformPreventInfiniteLoops from "./transformers/babel-plugin-transform-prevent-infinite-loops";
import { transformSync } from '@babel/core';
import { FeatureOptionsOf, languageDescription } from "./LangaugeDescription";
import JavascriptIcon from "../util/icons/JavascriptIcon";
import supportsGlobal from "./features/supportsGlobal";
import supportsIsolated from "./features/supportsIsolated";
import supportsEntryPoint from "./features/supportsEntryPoint";
import supportsBabelPlugins from "./features/supportsBabelPlugins";

export const javascriptDescription = languageDescription({
    name: 'javascript',
    monacoName: 'javascript',
    displayName: 'JavaScript',
    icon: JavascriptIcon,
    features: [
        supportsEntryPoint,
        supportsGlobal,
        supportsIsolated,
        supportsBabelPlugins
    ] as const,
    runnable: async () => new Javascript() as any,
});

export class Javascript implements RunnableLanguage<typeof javascriptDescription.features> {
    toRunnerCode(code: string, options: FeatureOptionsOf<typeof javascriptDescription>) {
        try {
            const result = transformSync(code, {
                plugins: [
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
            throw new Error('Javascript code must be generated in either global or entryPoint mode');
        }
        catch (e: any) {
            // The code will throw some sort of syntax error anyways, so we'll let it throw the browser version.
            return code;
        }
    }
}