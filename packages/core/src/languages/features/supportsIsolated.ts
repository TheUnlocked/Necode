import { FeatureDescription } from '@necode-org/activity-dev';

const supportsIsolated: FeatureDescription<{
    isolated: true;
}> = {
    name: 'supports:isolated'
};

export default supportsIsolated;