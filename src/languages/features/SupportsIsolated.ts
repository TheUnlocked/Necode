import FeatureDescription from "./FeatureDescription";

const supportsIsolated: FeatureDescription<{
    isolated: true;
}> = {
    name: 'supports:isolated'
};

export default supportsIsolated;
export type SupportsIsolated = typeof supportsIsolated;