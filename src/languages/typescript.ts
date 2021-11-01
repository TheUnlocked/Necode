import RunnableLanguage from "./RunnableLanguage";
import transformPreventInfiniteLoops from "./transformers/babel-plugin-transform-prevent-infinite-loops";
// @ts-ignore
import transformTypescript from "@babel/plugin-transform-typescript";
import { transformSync } from '@babel/core';
import { FeatureOptionsOf, languageDescription } from "./LangaugeDescription";
import TypescriptIcon from "../util/icons/TypescriptIcon";
import supportsAmbient from "./features/SupportsAmbient";
import supportsIsolated from "./features/SupportsIsolated";
import supportsEntryPoint from "./features/SupportsEntryPoint";

export const typescriptDescription = languageDescription({
    name: 'typescript',
    monacoName: 'typescript',
    displayName: 'TypeScript',
    icon: TypescriptIcon,
    features: [
        supportsEntryPoint,
        supportsAmbient,
        supportsIsolated,
    ] as const
});

export class Typescript implements RunnableLanguage<typeof typescriptDescription> {
    toRunnerCode(code: string, options: FeatureOptionsOf<typeof typescriptDescription>) {
        try {
            const result = transformSync(code, {
                plugins: [
                    transformTypescript,
                    transformPreventInfiniteLoops
                ]
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