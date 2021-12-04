import RunnableLanguage from "./RunnableLanguage";
import { FeatureOptionsOf, languageDescription } from "./LangaugeDescription";

export const glslDescription = languageDescription({
    name: 'glsl',
    monacoName: 'c',
    displayName: 'GLSL'
});

export class GLSL implements RunnableLanguage<typeof glslDescription> {
    toRunnerCode(code: string, options: FeatureOptionsOf<typeof glslDescription>) {
        return `window.GLSL_SHADER_CODE=${JSON.stringify(code)};`;
    }
}