import supportsEntryPoint from "../../languages/features/supportsEntryPoint";
import { activityDescription } from "../ActivityDescription";

const canvasActivityDescription = activityDescription({
    id: 'core/canvas-ring',
    displayName: 'Canvas Ring',
    requiredFeatures: [
        supportsEntryPoint
    ] as const,
    activityPage: async () => (await import('./CanvasActivity')).CanvasActivity,
    rtcPolicy: 'ring',
    defaultConfig: undefined
});

export default canvasActivityDescription;