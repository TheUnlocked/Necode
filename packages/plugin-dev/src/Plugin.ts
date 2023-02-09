import { ActivityManager } from './activities/ActivityManager';
import { FeatureManager } from './features/FeatureManager';
import { LanguageManager } from './languages/LanguageManager';

export abstract class Plugin {
    registerActivities?(manager: ActivityManager): void;
    registerLanguages?(manager: LanguageManager): void;
    registerFeatures?(manager: FeatureManager): void;
}