import { useMemo } from 'react';
import ActivityDescription from '~shared-ui/types/ActivityDescription';
import allActivities from '~core/activities/allActivities';

export default function useActivityDescription(id: string | undefined): ActivityDescription<any> | undefined {
    return useMemo(() => {
        if (id === undefined) {
            return undefined;
        }
        return allActivities.find(x => x.id === id);
    }, [id]);
}