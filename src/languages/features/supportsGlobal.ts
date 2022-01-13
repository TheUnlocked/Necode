import FeatureDescription from "./FeatureDescription";

const supportsGlobal: FeatureDescription<{
    global: true;
}> = {
    name: 'supports:globalContext'
};

export default supportsGlobal;