import ActivityDescription from "./ActivityDescription";
import canvasActivityDescription from "./canvas";
import testDomActivityDescription from "./test-dom";

const allActivities = [
    canvasActivityDescription,
    testDomActivityDescription
] as ActivityDescription<any>[];

export default allActivities;