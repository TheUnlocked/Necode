import { ComponentType } from "react";
import FeatureDescription, { ConstraintsOf } from "./features/FeatureDescription";

export default interface LanguageDescription<Features extends readonly FeatureDescription<any>[] = readonly FeatureDescription<any>[]> {
    readonly name: string;
    readonly monacoName: string;
    readonly displayName: string;
    readonly icon?: ComponentType;
    readonly features: Features;
}

export function languageDescription(desc: Omit<LanguageDescription<readonly []>, 'features'>): LanguageDescription<readonly []>;
export function languageDescription<Features extends readonly FeatureDescription<any>[]>(desc: LanguageDescription<Features>): LanguageDescription<Features>;
export function languageDescription(
    desc: Omit<LanguageDescription<readonly FeatureDescription<any>[]>, 'features'> & { features?: readonly FeatureDescription<any>[] }
) {
    desc.features ??= [];
    return desc;
}

export type FeatureOptionsOf<T extends LanguageDescription<any>> = Partial<{
    [Key in keyof ConstraintsOf<T['features']>]: ConstraintsOf<T['features']>[Key]
}>;