import { Lesson } from ".prisma/client";
import { DateTime } from "luxon";
import { fromLuxon, Iso8601Date } from "../../util/iso8601";
import { ActivityEntity } from "./ActivityEntity";
import { ClassroomEntity } from "./ClassroomEntity";
import { Entity, EntityType } from "./Entity";
import { EntityReference, makeEntityReference, makeEntityReferenceC } from "./EntityReference";


export type LessonEntity = Entity<EntityType.Lesson, {
    displayName: string;
    activities: EntityReference<ActivityEntity>[];
    classroom: EntityReference<ClassroomEntity>;
    date: Iso8601Date;
}>;

export function makeLessonEntity(lesson: Lesson, relationships: {
    activities: (string | ActivityEntity)[];
}): LessonEntity {
    return {
        type: EntityType.Lesson,
        id: lesson.id,
        attributes: {
            displayName: lesson.displayName,
            activities: relationships.activities.map(makeEntityReferenceC(EntityType.Activity)),
            date: fromLuxon(DateTime.fromJSDate(lesson.date).startOf('day')),
            classroom: makeEntityReference<ClassroomEntity>(EntityType.Classroom, lesson.classroomId)
        }
    };
}
