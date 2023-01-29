import { FeatureDescription } from '@necode-org/activity-dev';

const isTypescript: FeatureDescription<{
    throwAllCompilerErrors: boolean;
}> = {
    name: 'is:typescript'
};

export default isTypescript;