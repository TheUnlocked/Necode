import ActivityDescription from "../ActivityDescription";
// import { CreateTestActivity } from "./TestActivityConfigPage";
import { TestActivity, TestActivityConfigPage, TestActivityConfig } from "./TestActivity";
import supportsAmbient from "../../languages/features/SupportsAmbient";
import supportsIsolated from "../../languages/features/SupportsIsolated";

const testBasedActivityDescription: ActivityDescription<TestActivityConfig, [
    typeof supportsAmbient,
    typeof supportsIsolated
]> = {
    id: 'testbased:html',
    supportedFeatures: [
        supportsAmbient, supportsIsolated
    ],
    configPage: TestActivityConfigPage,
    activityPage: TestActivity,
};

export default testBasedActivityDescription;