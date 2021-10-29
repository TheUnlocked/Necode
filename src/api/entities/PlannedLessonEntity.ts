import { Activity, Lesson, PlannedLesson } from ".prisma/client";
import { DateTime } from "luxon";
import { ActivityEntity } from "./ActivityEntity";
import { ClassroomEntity } from "./ClassroomEntity";
import { Entity, EntityType } from "./Entity";
import { EntityReference, makeEntityReference } from "./EntityReference";
import { LessonEntity, makeLessonEntity } from "./LessonEntity";


export type PlannedLessonEntity = Entity<EntityType.PlannedLesson, LessonEntity['attributes'] & {
    classroom: EntityReference<ClassroomEntity>;
    date: DateTime;
}>;

export function makePlannedLessonEntity(lesson: PlannedLesson & { lesson: Lesson & { activities: { id: string }[] } }): PlannedLessonEntity {
    const lessonPart = makeLessonEntity(lesson.lesson, { activities: lesson.lesson.activities.map(x => x.id) });
    return {
        type: EntityType.PlannedLesson,
        id: lesson.lessonId,
        attributes: {
            ...lessonPart.attributes,
            date: DateTime.fromJSDate(lesson.date).startOf('day'),
            classroom: makeEntityReference<ClassroomEntity>(EntityType.Classroom, lesson.classroomId)
        }
    };
}
