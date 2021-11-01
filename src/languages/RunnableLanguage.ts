import { ConstraintsOf } from "./features/FeatureDescription";
import LanguageDescription from "./LangaugeDescription";

export default interface RunnableLanguage<TDescription extends LanguageDescription> {
    toRunnerCode(code: string, options: ConstraintsOf<TDescription['features']>): string;
}

