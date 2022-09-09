import { Lesson } from "@prisma/client";
import { DateTime } from "luxon";
import { fromLuxon, Iso8601Date } from "../../util/iso8601";
import { ActivityEntity } from "./ActivityEntity";
import { ClassroomEntity } from "./ClassroomEntity";
import { Entity, EntityType } from "./Entity";
import { EntityReference, EntityReferenceArray, makeEntityReference, makeEntityReferenceArray, ReferenceDepth } from "./EntityReference";


type Refs = { activities?: ReferenceDepth, classroom?: ReferenceDepth };

export type LessonEntity<References extends Refs = Refs>
    = Entity<EntityType.Lesson, {
        displayName: string;
        activities: EntityReferenceArray<ActivityEntity<any>, References['activities']>;
        classroom: EntityReference<ClassroomEntity<any>, References['classroom']>;
        date: Iso8601Date;
    }>;

export function makeLessonEntity<R extends Refs>(lesson: Lesson, relationships?: {
    activities?: (string | ActivityEntity<any>)[];
    classroom?: string | ClassroomEntity<any>;
}): LessonEntity<R> {
    return {
        type: EntityType.Lesson,
        id: lesson.id,
        attributes: {
            displayName: lesson.displayName,
            activities: makeEntityReferenceArray(EntityType.Activity, relationships?.activities),
            date: fromLuxon(DateTime.fromJSDate(lesson.date)),
            classroom: makeEntityReference(EntityType.Classroom, relationships?.classroom)
        }
    };
}
