import LanguageDescription from "../languages/LangaugeDescription";
import ActivityDescription from "./ActivityDescription";

export default function supportsLanguage(activity: ActivityDescription<any>, language: LanguageDescription) {
    const languageFeatureNames = language.features.map(x => x.name);
    return activity.supportedFeatures.every(f => languageFeatureNames.includes(f.name));
}