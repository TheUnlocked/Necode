import { ActivityEntity } from 'api/entities/ActivityEntity';
import { LessonEntity } from 'api/entities/LessonEntity';

export const activityDragDropType = 'application/necode-lesson-activity+json';
export const lessonDragDropType = 'application/necode-lesson/with-activities+json';

declare module 'use-dnd' {
    export interface DragTypeItemContentMap {
        [activityDragDropType]: ActivityEntity;
        [lessonDragDropType]: LessonEntity<{ activities: 'deep' }>;
    }
}
