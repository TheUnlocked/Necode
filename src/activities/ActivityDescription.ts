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
    
    saveData?: { data: any };

    onSaveDataChange: (newSaveData: { data: any } | undefined) => void;
}

export interface ActivityConfigPageProps<ConfigData = undefined> extends BaseActivityProps<ConfigData> {
    language: LanguageDescription;
    
    onActivityConfigChange: (newConfig: ConfigData) => void;
}

export interface ActivityConfigWidgetProps<ConfigData = undefined> extends BaseActivityProps<ConfigData> {
    activityTypeId: string;

    onActivityConfigChange: (newConfig: ConfigData) => void;
    
    goToConfigPage: (() => void) | undefined;
    
    startActivity: () => void;
    
    dragHandle: ConnectDragSource;

    displayName: string;
    
    onDisplayNameChange: (newDisplayName: string) => void;
}

interface ActivityDescription<ConfigData, Features extends readonly FeatureDescription<any>[] = readonly FeatureDescription<any>[]> {
    id: string;

    displayName: string;
    
    requiredFeatures: Features;

    defaultConfig: ConfigData;

    rtcPolicy?: string;

    configWidget?: ComponentType<ActivityConfigWidgetProps<ConfigData>>;

    configPage?: ComponentType<ActivityConfigPageProps<ConfigData>>;

    activityPage: ComponentType<ActivityPageProps<ConfigData>>;
}

export function activityDescription<ConfigData, Features extends readonly FeatureDescription<any>[]>(desc: ActivityDescription<ConfigData, Features>) {
    return desc;
}

export default ActivityDescription;