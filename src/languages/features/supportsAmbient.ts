import FeatureDescription from "./FeatureDescription";

const supportsAmbient: FeatureDescription<{
    ambient: true;
}> = {
    name: 'supports:ambient'
};

export default supportsAmbient;
export type SupportsAmbient = typeof supportsAmbient;