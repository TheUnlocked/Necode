import { ComponentType } from "react";
import { ConnectDragSource } from "react-dnd";
import FeatureDescription from "../languages/features/FeatureDescription";
import LanguageDescription from "../languages/LangaugeDescription";

export interface ActivityPageProps<ConfigData = undefined> {
    id: string;

    classroomId: string;

    language: LanguageDescription;

    activityConfig: ConfigData;
}

export interface ActivityConfigPageProps<ConfigData = undefined> extends ActivityPageProps<ConfigData> {
    onActivityConfigChange: (newConfig: ConfigData) => void;
}

export interface ActivityConfigWidgetProps<ConfigData = undefined> extends Omit<ActivityConfigPageProps<ConfigData>, 'language'> {
    goToConfigPage: (() => void) | undefined;
    
    dragHandle: ConnectDragSource;

    activity: ActivityDescription<ConfigData>;
}

interface ActivityDescription<ConfigData, Features extends FeatureDescription<any>[] = FeatureDescription<any>[]> {
    id: string;

    displayName: string;
    
    supportedFeatures: Features;

    defaultConfig: ConfigData;

    configWidget?: ComponentType<ActivityConfigWidgetProps<ConfigData>>;

    configPage?: ComponentType<ActivityConfigPageProps<ConfigData>>;

    activityPage: ComponentType<ActivityPageProps<ConfigData>>;
}

export default ActivityDescription;