import ActivityDescription from "../../activities/ActivityDescription";
import TextInputWidget, { TextInputWidgetProps } from "./TextInputWidget";

function NoopActivity() {
    return null;
}

const textInputDescription: ActivityDescription<TextInputWidgetProps> = {
    id: 'text-field',
    supportedFeatures: [],
    defaultConfig: {
        language: null,
        value: 'Write lesson notes here...'
    },
    activityPage: NoopActivity,
    configWidget: TextInputWidget
};

export default textInputDescription;