import { ActivitySubmission } from ".prisma/client";
import { ActivityEntity } from "./ActivityEntity";
import { Entity, EntityType } from "./Entity";
import { EntityReference, makeEntityReference, ReferenceDepth } from "./EntityReference";
import { UserEntity } from "./UserEntity";


type Refs = { user?: ReferenceDepth, activity?: ReferenceDepth };

export type ActivitySubmissionEntity<References extends Refs = Refs>
    = Entity<EntityType.ActivitySubmission, {
        version: number;
        data: any;
        user: EntityReference<UserEntity<any>, References['user']>;
        activity: EntityReference<ActivityEntity<any>, References['activity']>;
    }>;

export function makeActivitySubmissionEntity<R extends Refs>(submission: ActivitySubmission, relationships?: {
    user?: string | UserEntity<any>;
    activity?: string | ActivityEntity<any>;
}): ActivitySubmissionEntity<R> {
    return {
        type: EntityType.ActivitySubmission,
        id: submission.id,
        attributes: {
            version: submission.version,
            data: submission.data,
            user: makeEntityReference(EntityType.User, relationships?.user),
            activity: makeEntityReference(EntityType.Activity, relationships?.activity)
        }
    };
}
