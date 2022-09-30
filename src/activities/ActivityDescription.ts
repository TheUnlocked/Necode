import { ComponentType } from "react";
import { ConnectDragSource } from "react-dnd";
import { PolicyConfiguration } from '../api/RtcNetwork';
import FeatureDescription from "../languages/features/FeatureDescription";
import LanguageDescription from "../languages/LangaugeDescription";
import { Importable } from '../util/types';

interface BaseActivityProps<ConfigData = undefined> {
    id: string;

    classroomId: string;

    activityConfig: ConfigData;
}

export interface ActivityPageProps<ConfigData = undefined> extends BaseActivityProps<ConfigData> {
    language: LanguageDescription;
    
    saveData?: { data: any };

    onSaveDataChange: (newSaveData: { data: any } | undefined) => void;

    onSubmit: (data: any) => Promise<void>;
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

    configurePolicies?: (config: ConfigData) => readonly PolicyConfiguration[];

    configWidget?: Importable<ComponentType<ActivityConfigWidgetProps<ConfigData>>>;

    configPage?: Importable<ComponentType<ActivityConfigPageProps<ConfigData>>>;

    activityPage: Importable<ComponentType<ActivityPageProps<ConfigData>>>;
}

export function activityDescription<ConfigData, Features extends readonly FeatureDescription<any>[]>(desc: ActivityDescription<ConfigData, Features>) {
    return desc;
}

export default ActivityDescription;