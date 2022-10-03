import FeatureDescription from "./FeatureDescription";

const isTypescript: FeatureDescription<{
    throwAllCompilerErrors: boolean;
}> = {
    name: 'is:typescript'
};

export default isTypescript;