import ActivityDescription from "./ActivityDescription";
import canvasActivityDescription from "./canvas";
import glslActivityDescription from "./glsl";
import p5jsActivityDescription from "./p5js";
import p5jsRingActivityDescription from "./p5-canvas";
import { testDomActivityDescription, testDomActivityNetworkedDescription } from "./test-dom";
import textInputActivityDescription from './text-input/textInputDescription';

const allActivities = [
    canvasActivityDescription,
    testDomActivityDescription,
    testDomActivityNetworkedDescription,
    p5jsActivityDescription,
    p5jsRingActivityDescription,
    glslActivityDescription,
    textInputActivityDescription,
] as ActivityDescription<any>[];

export default allActivities;