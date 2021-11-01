import { ComponentType } from "react";
import FeatureDescription, { ConstraintsOf } from "./features/FeatureDescription";

export default interface LanguageDescription<Features extends FeatureDescription<any>[] = FeatureDescription<any>[]> {
    name: string;
    monacoName: string;
    displayName: string;
    icon?: ComponentType;
    features: Features;
}

export type FeatureOptionsOf<T extends LanguageDescription<any>> = ConstraintsOf<T['features']>;