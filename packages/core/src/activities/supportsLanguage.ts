import { ActivityDescription, LanguageDescription } from '@necode-org/activity-dev';

export default function supportsLanguage(activity: ActivityDescription<any>, language: LanguageDescription) {
    const languageFeatureNames = language.features.map(x => x.name);
    return activity.requiredFeatures.every(f => languageFeatureNames.includes(f.name));
}