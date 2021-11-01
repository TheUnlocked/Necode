import RunnableLanguage from "./RunnableLanguage";
import transformPreventInfiniteLoops from "./transformers/babel-plugin-transform-prevent-infinite-loops";
import { transformSync } from '@babel/core';
import { FeatureOptionsOf, languageDescription } from "./LangaugeDescription";
import JavascriptIcon from "../util/icons/JavascriptIcon";
import supportsAmbient from "./features/SupportsAmbient";
import supportsIsolated from "./features/SupportsIsolated";
import supportsEntryPoint from "./features/SupportsEntryPoint";

export const javascriptDescription = languageDescription({
    name: 'javascript',
    monacoName: 'javascript',
    displayName: 'JavaScript',
    icon: JavascriptIcon,
    features: [
        supportsEntryPoint,
        supportsAmbient,
        supportsIsolated,
    ] as const
});

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