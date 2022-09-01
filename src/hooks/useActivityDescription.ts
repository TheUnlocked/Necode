import ActivityDescription from '../activities/ActivityDescription';
import allActivities from '../activities/allActivities';

export default function useActivityDescription(id: string | undefined): ActivityDescription<any> | undefined {
    if (id === undefined) {
        return undefined;
    }
    return allActivities.find(x => x.id === id);
}