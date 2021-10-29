import { Lesson } from ".prisma/client";
import { ActivityEntity } from "./ActivityEntity";
import { Entity, EntityType } from "./Entity";
import { EntityReference, makeEntityReferenceC } from "./EntityReference";


export type LessonEntity = Entity<EntityType.Lesson, {
    displayName: string;
    activities: EntityReference<ActivityEntity>[];
}>;

export function makeLessonEntity(lesson: Lesson, relationships: {
    activities: (string | ActivityEntity)[];
}): LessonEntity {
    return {
        type: EntityType.Lesson,
        id: lesson.id,
        attributes: {
            displayName: lesson.displayName,
            activities: relationships.activities.map(makeEntityReferenceC(EntityType.Activity))
        }
    };
}
