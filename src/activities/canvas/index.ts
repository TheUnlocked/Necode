import supportsEntryPoint from "../../languages/features/supportsEntryPoint";
import ActivityDescription from "../ActivityDescription";
import { CanvasActivity } from "./CanvasActivity";

const canvasActivityDescription: ActivityDescription<undefined, [
    typeof supportsEntryPoint
]> = {
    id: 'canvas:ring',
    supportedFeatures: [
        supportsEntryPoint
    ],
    activityPage: CanvasActivity,
    defaultConfig: undefined
};

export default canvasActivityDescription;