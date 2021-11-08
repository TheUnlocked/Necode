import RunnableLanguage from "./RunnableLanguage";
import transformPreventInfiniteLoops from "./transformers/babel-plugin-transform-prevent-infinite-loops";
// @ts-ignore
import transformTypescript from "@babel/plugin-transform-typescript";
import { transformSync } from '@babel/core';
import { FeatureOptionsOf, languageDescription } from "./LangaugeDescription";
import TypescriptIcon from "../util/icons/TypescriptIcon";
import supportsAmbient from "./features/supportsAmbient";
import supportsIsolated from "./features/supportsIsolated";
import supportsEntryPoint from "./features/supportsEntryPoint";
import supportsBabelPlugins from "./features/supportsBabelPlugins";

export const typescriptDescription = languageDescription({
    name: 'typescript',
    monacoName: 'typescript',
    displayName: 'TypeScript',
    icon: TypescriptIcon,
    features: [
        supportsEntryPoint,
        supportsAmbient,
        supportsIsolated,
        supportsBabelPlugins
    ] as const
});

export class Typescript implements RunnableLanguage<typeof typescriptDescription> {
    toRunnerCode(code: string, options: FeatureOptionsOf<typeof typescriptDescription> & { throwAllCompilerErrors?: boolean }) {
        try {
            const result = transformSync(code, {
                plugins: [
                    transformTypescript,
                    ...options.babelPlugins ?? [],
                    transformPreventInfiniteLoops
                ]
            });

            if (options.ambient) {
                return result!.code!;
            }
            if (typeof options.entryPoint === 'string') {
                return `const entry = new Function(${JSON.stringify(`${result!.code}\nreturn ${options.entryPoint};`)})();`;
            }
            throw new Error('Typescript code must be generated in either ambient or entryPoint mode');
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