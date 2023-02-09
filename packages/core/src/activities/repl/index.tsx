import supportsBabelPlugins from '../../languages/features/supportsBabelPlugins';
import supportsGlobal from '../../languages/features/supportsGlobal';
import supportsIsolated from '../../languages/features/supportsIsolated';
import { ActivityConfigWidgetProps, activityDescription, DefaultActivityWidget } from '@necode-org/activity-dev';
import PolicySelect from '@necode-org/activity-dev/src/components/PolicySelect';
import { set } from 'lodash/fp';

export interface Config {
    policy: string;
}

function Widget(props: ActivityConfigWidgetProps<Config>) {
    const { activityConfig, onActivityConfigChange } = props;
    return <DefaultActivityWidget {...props}>
        <PolicySelect value={activityConfig.policy} onChange={x => onActivityConfigChange(set('policy', x, activityConfig))} />
    </DefaultActivityWidget>;
}

const canvasActivityDescription = activityDescription({
    id: 'core/repl',
    displayName: 'REPL',
    requiredFeatures: [
        supportsGlobal,
        supportsIsolated,
        supportsBabelPlugins, // to get JS and TS only
    ] as const,
    configurePolicies: ({ policy }) => [{ name: policy }],
    activityPage: async () => (await import('./activity')).Activity,
    configWidget: async () => Widget,
    defaultConfig: { policy: 'noop' },
});

export default canvasActivityDescription;