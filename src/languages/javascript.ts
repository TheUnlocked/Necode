import RunnableLanguage from "./RunnableLanguage";
import transformPreventInfiniteLoops from "./transformers/babel-plugin-transform-prevent-infinite-loops";
import { transformSync } from '@babel/core';
import LanguageDescription, { FeatureOptionsOf } from "./LangaugeDescription";
import JavascriptIcon from "../util/icons/JavascriptIcon";
import supportsAmbient, { SupportsAmbient } from "./features/SupportsAmbient";
import supportsIsolated, { SupportsIsolated } from "./features/SupportsIsolated";
import supportsEntryPoint, { SupportsEntryPoint } from "./features/SupportsEntryPoint";

export const javascriptDescription: LanguageDescription<[
    SupportsEntryPoint,
    SupportsAmbient,
    SupportsIsolated
]> = {
    name: 'javascript',
    monacoName: 'javascript',
    displayName: 'JavaScript',
    icon: JavascriptIcon,
    features: [
        supportsEntryPoint,
        supportsAmbient,
        supportsIsolated,
    ]
};

export class Javascript implements RunnableLanguage<typeof javascriptDescription> {
    toRunnerCode(code: string, options: FeatureOptionsOf<typeof javascriptDescription>) {
        try {
            const result = transformSync(code, {
                plugins: [transformPreventInfiniteLoops]
            });
            if (options.ambient) {
                return result!.code!;
            }
            return `const entry = new Function(${JSON.stringify(`${result!.code}\nreturn ${options.entryPoint};`)})();`;
        }
        catch (e) {
            // The code will throw some sort of syntax error anyways, so we'll let it throw the browser version.
            return code;
        }
    }
}