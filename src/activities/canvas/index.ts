import supportsEntryPoint from "../../languages/features/supportsEntryPoint";
import { activityDescription } from "../ActivityDescription";

const canvasActivityDescription = activityDescription({
    id: 'core/canvas-ring',
    displayName: 'Canvas Ring',
    requiredFeatures: [
        supportsEntryPoint
    ] as const,
    configurePolicies: () => [{ name: 'ring' }],
    activityPage: async () => (await import('./CanvasActivity')).CanvasActivity,
    defaultConfig: undefined
});

export default canvasActivityDescription;