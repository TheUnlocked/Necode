import { SvgIconProps } from "@mui/material";
import { ComponentType } from "react";
import { Importable } from '~utils/types';
import FeatureDescription, { ConstraintsOf } from "./FeatureDescription";
import RunnableLanguage from './RunnableLanguage';

export function isLanguage(language: Partial<LanguageDescription> & { name: string }): FeatureDescription<{}> {
    return {
        name: `is:${language.name}`
    };
};

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

export type FeatureOptionsOf<T extends LanguageDescription<any>> = Partial<ConstraintsOf<T['features']>>;