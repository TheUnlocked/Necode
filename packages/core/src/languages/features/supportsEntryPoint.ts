import { FeatureDescription } from '@necode-org/activity-dev';

const supportsEntryPoint: FeatureDescription<{
    entryPoint: string;
}> = {
    name: 'supports:entryPoint'
};

export default supportsEntryPoint;