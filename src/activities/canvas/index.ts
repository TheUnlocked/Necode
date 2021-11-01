import supportsEntryPoint from "../../languages/features/SupportsEntryPoint";
import ActivityDescription from "../ActivityDescription";
import { CanvasActivity } from "./CanvasActivity";

const canvasActivityDescription: ActivityDescription<undefined, [
    typeof supportsEntryPoint
]> = {
    id: 'canvas:ring',
    supportedFeatures: [
        supportsEntryPoint
    ],
    activityPage: CanvasActivity
};

export default canvasActivityDescription;