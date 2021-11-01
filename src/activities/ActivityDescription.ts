import { ComponentType } from "react";
import FeatureDescription, { ConstraintsOf } from "../languages/features/FeatureDescription";
import LanguageDescription from "../languages/LangaugeDescription";

export interface ActivityConfigComponentProps {

}

export interface ActivityPageProps<ConfigData = undefined> {
    classroom: string;

    language: LanguageDescription;

    activityConfig: ConfigData;
}

interface ActivityDescription<ConfigData, Features extends FeatureDescription<any>[] = FeatureDescription<any>[]> {
    id: string;
    
    supportedFeatures: Features;

    configWidget?: ComponentType<ActivityConfigComponentProps>;

    configPage?: ComponentType<ActivityConfigComponentProps>;

    activityPage: ComponentType<ActivityPageProps<ConfigData>>;
}

export default ActivityDescription;