import ActivityDescription from "./ActivityDescription";
import canvasActivityDescription from "./canvas";
import testBasedActivityDescription from "./html-test-based";

const allActivities = [
    canvasActivityDescription,
    testBasedActivityDescription
] as ActivityDescription<any>[];

export default allActivities;