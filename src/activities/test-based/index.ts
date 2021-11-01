import ActivityDescription from "../ActivityDescription";
import { CreateTestActivity } from "./TestActivityConfigPage";
import TestActivity, { TestActivityConfig } from "./TestActivity";
import supportsAmbient from "../../languages/features/SupportsAmbient";
import supportsIsolated from "../../languages/features/SupportsIsolated";

export const testBasedActivityDescription: ActivityDescription<TestActivityConfig, [
    typeof supportsAmbient,
    typeof supportsIsolated
]> = {
    id: 'testbased:html',
    supportedFeatures: [
        supportsAmbient, supportsIsolated
    ],
    configPage: CreateTestActivity,
    activityPage: TestActivity,
};
