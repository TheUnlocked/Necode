import supportsEntryPoint from "../../languages/features/supportsEntryPoint";
import { activityDescription } from "../ActivityDescription";
import { CanvasActivity } from "./CanvasActivity";

const canvasActivityDescription = activityDescription({
    id: 'core/canvas-ring',
    displayName: 'Canvas Ring',
    supportedFeatures: [
        supportsEntryPoint
    ] as const,
    activityPage: CanvasActivity,
    defaultConfig: undefined
});

export default canvasActivityDescription;