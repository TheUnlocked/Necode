import { Feature } from '../../../activity-dev/src';
import { ActivityDescription } from './ActivityDescription';

export class ActivityManager {
    /** @internal */
    constructor(private activities: Map<string, ActivityDescription<any, any>>) {}

    registerActivity<Features extends readonly Feature[]>(activity: ActivityDescription<any, Features>) {
        if (this.activities.has(activity.id)) {
            console.error(`Activity with ID ${activity.id} has already been defined. Skipping.`);
            return;
        }
        if (activity.requiredFeatures.some(x => /^requires(?:\/|$)/.test(x))) {
            console.error('"requires/" features are used to provide information to Necode itself and cannot be used in activities. Skipping.');
            return;
        }
        this.activities.set(activity.id, activity);
    }
}