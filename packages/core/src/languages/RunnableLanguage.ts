import FeatureDescription, { ConstraintsOf } from "./features/FeatureDescription";

export default interface RunnableLanguage<Features extends readonly FeatureDescription<any>[] = readonly FeatureDescription<any>[]> {
    // Property instead of method to get stricter typing
    toRunnerCode: (code: string, options: ConstraintsOf<Features>) => string;
}