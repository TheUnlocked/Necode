import ActivityDescription from '../activities/ActivityDescription';
import allActivities from '../activities/allActivities';

export default function useActivityDescription(id: string): ActivityDescription<any> | undefined {
    return allActivities.find(x => x.id === id);
}