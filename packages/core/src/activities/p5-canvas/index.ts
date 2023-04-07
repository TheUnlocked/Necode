import { activityDescription } from '@necode-org/plugin-dev';
import { Configuration } from '../canvas';

const canvasActivityDescription = activityDescription({
    id: 'core/canvas-ring/p5',
    displayName: 'p5.js Ring',
    requiredFeatures: [
        'iframe/static'
    ],
    configurePolicies: () => [{ name: 'core/ring' }],
    activityPage: async () => (await import('./activity')).Activity,
    configWidget: async () => (await import('../canvas/Widget')).CanvasWidget,
    defaultConfig: { canvasWidth: 400, canvasHeight: 400 } as Configuration
});

export default canvasActivityDescription;