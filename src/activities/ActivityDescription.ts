import { ComponentType } from "react";
import { SupportedLanguage } from "../languages/supportedLanguages";

export interface ActivityConfigComponentProps {

}

export interface ActivityPageProps {
    classroom: string;
    language: SupportedLanguage;
}

interface BaseActivityDefinition {
    id: string;
    
    supportedLanguages: SupportedLanguage[];

    /**
     * * `'none'` - This activity requires no configuration.
     * * `'inline'` - This activity can be configured through a widget in the lesson manager.
     * * `'page'` - This activity requires a separate page to configure.
     */
    configType: 'none' | 'widget' | 'page';

    activityPage: ComponentType<ActivityPageProps>
}

interface ActivityWithoutConfig extends BaseActivityDefinition {
    configType: 'none';
}

interface ActivityWithWidgetConfig extends BaseActivityDefinition {
    configType: 'widget';
    configWidget: ComponentType<ActivityConfigComponentProps>;
}

interface ActivityWithPageConfig extends BaseActivityDefinition {
    configType: 'page';
    configPage: ComponentType<ActivityConfigComponentProps>;
}

type ActivityDescription = ActivityWithoutConfig | ActivityWithWidgetConfig | ActivityWithPageConfig;

export default ActivityDescription;