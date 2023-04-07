import { ComponentType } from "react";
import { RefConnector } from "use-dnd";
import { PolicyConfiguration } from '@necode-org/activity-dev';
import { LanguageDescription } from "../languages/LanguageDescription";
import { Importable } from '~utils/types';
import { FeatureObject, Feature } from '@necode-org/plugin-dev';

interface BaseActivityProps<ConfigData = undefined> {
    id: string;

    classroomId: string;

    activityConfig: ConfigData;
}

export interface ActivityPageProps<
    Features extends readonly Feature[] = readonly Feature[],
    ConfigData = undefined
> extends BaseActivityProps<ConfigData> {
    language: LanguageDescription;
    features: FeatureObject<Features>;
}

export interface ActivityConfigPageProps<
    Features extends readonly Feature[] = readonly Feature[],
    ConfigData = undefined
> extends ActivityPageProps<Features, ConfigData> {
    onActivityConfigChange: (newConfig: ConfigData) => void;
}

export interface ActivityConfigWidgetProps<
    ConfigData = undefined
> extends BaseActivityProps<ConfigData> {
    onActivityConfigChange: (newConfig: ConfigData) => void;

    activityType: ActivityDescription;
    
    goToConfigPage: (() => void) | undefined;
    
    startActivity: () => void;
    
    dragHandle: RefConnector;

    displayName: string;
    
    onDisplayNameChange: (newDisplayName: string) => void;
}

export interface ActivityDescription<ConfigData = any, Features extends readonly Feature[] = any[]> {
    id: string;

    displayName: string;
    
    requiredFeatures: Features;

    defaultConfig: ConfigData;

    configurePolicies?: (config: ConfigData) => readonly PolicyConfiguration[];

    configWidget?: Importable<ComponentType<ActivityConfigWidgetProps<ConfigData>>>;

    configPage?: Importable<ComponentType<ActivityConfigPageProps<Features, ConfigData>>>;

    activityPage: Importable<ComponentType<ActivityPageProps<Features, ConfigData>>>;
}

export function activityDescription<ConfigData, Features extends readonly Feature[]>(desc: ActivityDescription<ConfigData, Features>) {
    return desc;
}
