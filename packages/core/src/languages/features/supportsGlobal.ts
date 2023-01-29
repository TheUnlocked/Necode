import { FeatureDescription } from '@necode-org/activity-dev';

const supportsGlobal: FeatureDescription<{
    global: true;
}> = {
    name: 'supports:global'
};

export default supportsGlobal;