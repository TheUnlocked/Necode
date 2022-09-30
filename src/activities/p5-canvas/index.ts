import supportsBabelPlugins from '../../languages/features/supportsBabelPlugins';
import supportsGlobal from '../../languages/features/supportsGlobal';
import supportsIsolated from '../../languages/features/supportsIsolated';
import { activityDescription } from "../ActivityDescription";

const canvasActivityDescription = activityDescription({
    id: 'core/canvas-ring/p5',
    displayName: 'p5.js Ring',
    requiredFeatures: [
        supportsGlobal,
        supportsIsolated,
        supportsBabelPlugins, // to get JS and TS only
    ] as const,
    configurePolicies: () => [{ name: 'ring' }],
    activityPage: async () => (await import('./activity')).Activity,
    defaultConfig: undefined
});

export default canvasActivityDescription;