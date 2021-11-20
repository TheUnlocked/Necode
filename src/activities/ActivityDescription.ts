import { ComponentType } from "react";
import { ConnectDragSource } from "react-dnd";
import { SocketInfo } from "../hooks/SocketHook";
import FeatureDescription from "../languages/features/FeatureDescription";
import LanguageDescription from "../languages/LangaugeDescription";

interface BaseActivityProps<ConfigData = undefined> {
    id: string;

    classroomId: string;

    activityConfig: ConfigData;
}

export interface ActivityPageProps<ConfigData = undefined> extends BaseActivityProps<ConfigData> {
    language: LanguageDescription;

    socketInfo: SocketInfo | undefined;
}

export interface ActivityConfigPageProps<ConfigData = undefined> extends BaseActivityProps<ConfigData> {
    language: LanguageDescription;
    
    onActivityConfigChange: (newConfig: ConfigData) => void;
}

export interface ActivityConfigWidgetProps<ConfigData = undefined> extends BaseActivityProps<ConfigData> {
    onActivityConfigChange: (newConfig: ConfigData) => void;
    
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