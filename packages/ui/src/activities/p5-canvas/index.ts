import supportsBabelPlugins from '../../languages/features/supportsBabelPlugins';
import supportsGlobal from '../../languages/features/supportsGlobal';
import supportsIsolated from '../../languages/features/supportsIsolated';
import { activityDescription } from "../ActivityDescription";
import { Configuration } from '../canvas';

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
    configWidget: async () => (await import('../canvas/Widget')).CanvasWidget,
    defaultConfig: { canvasWidth: 400, canvasHeight: 400 } as Configuration
});

export default canvasActivityDescription;