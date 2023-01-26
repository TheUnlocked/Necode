import LanguageDescription from "../LangaugeDescription";
import FeatureDescription from "./FeatureDescription";

export default function isLanguage(language: Partial<LanguageDescription> & { name: string }): FeatureDescription<{}> {
    return {
        name: `is:${language.name}`
    };
};