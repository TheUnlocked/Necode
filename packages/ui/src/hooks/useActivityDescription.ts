import { useMemo } from 'react';
import ActivityDescription from '../../../core/src/activities/ActivityDescription';
import allActivities from '../../../core/src/activities/allActivities';

export default function useActivityDescription(id: string | undefined): ActivityDescription<any> | undefined {
    return useMemo(() => {
        if (id === undefined) {
            return undefined;
        }
        return allActivities.find(x => x.id === id);
    }, [id]);
}