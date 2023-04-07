import { Activity } from "~database";
import { Entity, EntityType } from "./Entity";
import { EntityReference, makeEntityReference, ReferenceDepth } from "./EntityReference";
import { LessonEntity } from "./LessonEntity";


export type ActivityEntityRefs = { lesson?: ReferenceDepth };

export type ActivityEntity<References extends ActivityEntityRefs = ActivityEntityRefs>
    = Entity<EntityType.Activity, {
        activityType: string;
        lesson: EntityReference<LessonEntity<any>, References['lesson']>;
        displayName: string;
        configuration: any;
        enabledLanguages: string[];
    }>;

export function makeActivityEntity<R extends ActivityEntityRefs = any>(activity: Activity, relationships?: {
    lesson?: LessonEntity<any> | string;
}): ActivityEntity<R> {
    return {
        type: EntityType.Activity,
        id: activity.id,
        attributes: {
            activityType: activity.activityType,
            displayName: activity.displayName,
            configuration: activity.configuration,
            enabledLanguages: activity.enabledLanguages,
            lesson: makeEntityReference(EntityType.Lesson, relationships?.lesson)
        }
    };
}
