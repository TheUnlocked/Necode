import { Activity } from ".prisma/client";
import { Entity, EntityType } from "./Entity";
import { EntityReference, makeEntityReference, ReferenceDepth } from "./EntityReference";
import { LessonEntity } from "./LessonEntity";


type Refs = { lesson?: ReferenceDepth };

export type ActivityEntity<References extends Refs = Refs>
    = Entity<EntityType.Activity, {
        activityType: string;
        lesson: EntityReference<LessonEntity<any>, References['lesson']>;
        configuration: any;
        enabledLanguages: string[];
    }>;

export function makeActivityEntity<R extends Refs = any>(activity: Activity, relationships?: {
    lesson?: LessonEntity<any> | string;
}): ActivityEntity<R> {
    return {
        type: EntityType.Activity,
        id: activity.id,
        attributes: {
            activityType: activity.activityType,
            configuration: activity.configuration,
            enabledLanguages: activity.enabledLanguages,
            lesson: makeEntityReference(EntityType.Lesson, relationships?.lesson)
        }
    };
}
