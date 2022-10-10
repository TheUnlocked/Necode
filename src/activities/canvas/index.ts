import supportsEntryPoint from "../../languages/features/supportsEntryPoint";
import { activityDescription } from "../ActivityDescription";

export type Configuration = undefined | {
    canvasWidth: number;
    canvasHeight: number;
};

const canvasActivityDescription = activityDescription({
    id: 'core/canvas-ring',
    displayName: 'Canvas Ring',
    requiredFeatures: [
        supportsEntryPoint
    ] as const,
    configurePolicies: () => [{ name: 'ring' }],
    activityPage: async () => (await import('./CanvasActivity')).CanvasActivity,
    configWidget: async () => (await import('./Widget')).CanvasWidget,
    defaultConfig: { canvasWidth: 400, canvasHeight: 400 } as Configuration,
});

export default canvasActivityDescription;