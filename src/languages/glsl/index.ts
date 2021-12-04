import RunnableLanguage from "../RunnableLanguage";
import { FeatureOptionsOf, languageDescription } from "../LangaugeDescription";
import injectionCode from "raw-loader!./inject.js.raw";

export const glslDescription = languageDescription({
    name: 'glsl',
    monacoName: 'c',
    displayName: 'GLSL'
});

export class GLSL implements RunnableLanguage<typeof glslDescription> {
    toRunnerCode(code: string, options: FeatureOptionsOf<typeof glslDescription>) {
        return injectionCode.replace('__GLSL_USER_INPUT_SOURCE__', JSON.stringify(code));
    }
}