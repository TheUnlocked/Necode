import { SvgIconProps } from "@mui/material";
import { ComponentType } from "react";
import { Importable } from '~utils/types';
import FeatureDescription, { ConstraintsOf } from "./features/FeatureDescription";
import isLanguage from "./features/isLanguage";
import RunnableLanguage from './RunnableLanguage';

export default interface LanguageDescription<Features extends readonly FeatureDescription<any>[] = readonly FeatureDescription<any>[]> {
    readonly name: string;
    readonly monacoName: string;
    readonly displayName: string;
    readonly icon?: ComponentType<SvgIconProps>;
    readonly features: Features;

    readonly runnable?: Importable<RunnableLanguage<Features>>;
}

export function languageDescription(desc: Omit<LanguageDescription<readonly []>, 'features'>): LanguageDescription<readonly []>;
export function languageDescription<Features extends readonly FeatureDescription<any>[]>(desc: LanguageDescription<Features>): LanguageDescription<Features>;
export function languageDescription(
    desc: Omit<LanguageDescription<readonly FeatureDescription<any>[]>, 'features'> & { features?: readonly FeatureDescription<any>[] }
) {
    desc.features ??= [];
    desc.features = [...desc.features, isLanguage(desc)];
    return desc;
}

export type FeatureOptionsOf<T extends LanguageDescription<any>> = Partial<{
    [Key in keyof ConstraintsOf<T['features']>]: ConstraintsOf<T['features']>[Key]
}>;