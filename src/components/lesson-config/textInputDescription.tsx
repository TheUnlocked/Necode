import ActivityDescription from "../../activities/ActivityDescription";
import NoopActivity from "./NoopActivity";
import TextInputWidget, { TextInputWidgetProps } from "./TextInputWidget";

/** The "activity" representing a text input. It exists for its utility as a widget. */
const textInputActivityDescription: ActivityDescription<TextInputWidgetProps> = {
    id: 'text-field',
    supportedFeatures: [],
    defaultConfig: {
        language: null,
        value: 'Write lesson notes here...'
    },
    activityPage: NoopActivity,
    configWidget: TextInputWidget
};

export default textInputActivityDescription;