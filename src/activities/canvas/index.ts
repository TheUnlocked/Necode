import ActivityDescription from "../ActivityDescription";
import { CanvasActivity } from "./CanvasActivity";

const canvasActivityDescription: ActivityDescription = {
    id: 'canvas:ring',
    configType: 'none',
    activityPage: CanvasActivity,
    supportedLanguages: ['javascript', 'typescript', 'python3']
};

export default canvasActivityDescription;