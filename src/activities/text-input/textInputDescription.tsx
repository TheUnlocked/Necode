import { activityDescription } from "../ActivityDescription";
import NoopActivity from "../NoopActivity";
import TextInputWidget from "./TextInputWidget";

/** The "activity" representing a text input. It exists for its utility as a widget. */
const textInputActivityDescription = activityDescription({
    id: 'core/noop/text-field',
    displayName: 'If this text is showing, you have encountered a bug :)',
    requiredFeatures: [],
    defaultConfig: {
        language: null as string | null,
        value: 'Write lesson notes here...'
    },
    activityPage: NoopActivity,
    configWidget: TextInputWidget
});

export default textInputActivityDescription;