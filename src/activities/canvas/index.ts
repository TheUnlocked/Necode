import supportsEntryPoint from "../../languages/features/supportsEntryPoint";
import { activityDescription } from "../ActivityDescription";
import { CanvasActivity } from "./CanvasActivity";

const canvasActivityDescription = activityDescription({
    id: 'core/canvas-ring',
    displayName: 'Canvas Ring',
    requiredFeatures: [
        supportsEntryPoint
    ] as const,
    activityPage: CanvasActivity,
    rtcPolicy: 'ring',
    defaultConfig: undefined
});

export default canvasActivityDescription;