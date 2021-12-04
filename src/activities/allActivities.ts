import ActivityDescription from "./ActivityDescription";
import canvasActivityDescription from "./canvas";
import p5jsActivityDescription from "./p5js";
import testDomActivityDescription from "./test-dom";

const allActivities = [
    canvasActivityDescription,
    testDomActivityDescription,
    p5jsActivityDescription
] as ActivityDescription<any>[];

export default allActivities;