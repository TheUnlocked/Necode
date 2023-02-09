import { activityDescription } from '@necode-org/plugin-dev';

/** The "activity" representing a text input. It exists for its utility as a widget. */
const textInputActivityDescription = activityDescription({
    id: 'core/noop/text-field',
    displayName: 'If this text is showing, you have encountered a bug :)',
    requiredFeatures: [],
    defaultConfig: {
        language: null as string | null,
        value: 'Write lesson notes here...'
    },
    activityPage: async () => (await import('../NoopActivity')).default,
    configWidget: async () => (await import('./TextInputWidget')).default,
});

export default textInputActivityDescription;