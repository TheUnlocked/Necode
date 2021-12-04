import ActivityDescription from "./ActivityDescription";
import canvasActivityDescription from "./canvas";
import glslActivityDescription from "./glsl";
import p5jsActivityDescription from "./p5js";
import testDomActivityDescription from "./test-dom";

const allActivities = [
    canvasActivityDescription,
    testDomActivityDescription,
    p5jsActivityDescription,
    glslActivityDescription
] as ActivityDescription<any>[];

export default allActivities;