import { RunnableLanguage, FeatureOptionsOf, languageDescription } from '@necode-org/activity-dev';
import injectionCode from "raw-loader!./inject.js.raw";

export const glslDescription = languageDescription({
    name: 'glsl',
    monacoName: 'c',
    displayName: 'GLSL'
});

export class GLSL implements RunnableLanguage<typeof glslDescription.features> {
    toRunnerCode(code: string, options: FeatureOptionsOf<typeof glslDescription>) {
        return injectionCode.replace('__GLSL_USER_INPUT_SOURCE__', JSON.stringify(code));
    }
}