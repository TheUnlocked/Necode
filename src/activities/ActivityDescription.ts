import { ComponentType } from "react";
import FeatureDescription from "../languages/features/FeatureDescription";
import LanguageDescription from "../languages/LangaugeDescription";

export interface ActivityConfigComponentProps<ConfigData = undefined> {
    classroom: string;
    
    language: LanguageDescription;
    
    activityConfig: ConfigData;

    onActivityConfigChange: (newConfig: ConfigData) => void;
}

export interface ActivityPageProps<ConfigData = undefined> {
    classroom: string;

    language: LanguageDescription;

    activityConfig: ConfigData;
}

interface ActivityDescription<ConfigData, Features extends FeatureDescription<any>[] = FeatureDescription<any>[]> {
    id: string;
    
    supportedFeatures: Features;

    defaultConfig: ConfigData;

    configWidget?: ComponentType<ActivityConfigComponentProps<ConfigData>>;

    configPage?: ComponentType<ActivityConfigComponentProps<ConfigData>>;

    activityPage: ComponentType<ActivityPageProps<ConfigData>>;
}

export default ActivityDescription;