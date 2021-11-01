import { ConstraintsOf } from "./features/FeatureDescription";
import LanguageDescription from "./LangaugeDescription";

export default interface RunnableLanguage<TDescription extends LanguageDescription> {
    // Property instead of method to get stricter typing
    toRunnerCode: (code: string, options: ConstraintsOf<TDescription['features']>) => string;
}