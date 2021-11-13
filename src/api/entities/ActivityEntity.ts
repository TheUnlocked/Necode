import { Activity } from ".prisma/client";
import { Entity, EntityType } from "./Entity";
import { EntityReference, makeEntityReference } from "./EntityReference";
import { LessonEntity } from "./LessonEntity";


export type ActivityEntity = Entity<EntityType.Activity, {
    activityType: string;
    // displayName: string;
    lesson: EntityReference<LessonEntity>;
    configuration: any;
    supportedLanguages: string[];
}>;

export function makeActivityEntity(activity: Activity, relationships?: {
    lesson?: LessonEntity;
}): ActivityEntity {
    return {
        type: EntityType.Activity,
        id: activity.id,
        attributes: {
            activityType: activity.activityType,
            // displayName: activity.displayName,
            configuration: activity.configuration,
            supportedLanguages: activity.supportedLanguages,
            lesson: makeEntityReference(EntityType.Lesson, relationships?.lesson ?? activity.lessonId)
        }
    };
}
