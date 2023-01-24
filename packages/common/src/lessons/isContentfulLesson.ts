import { LessonEntity } from 'api/entities/LessonEntity';

export default function isContentfulLesson(
    lesson: LessonEntity<{ activities: 'shallow' }> | undefined
): lesson is LessonEntity<{ activities: 'shallow' }> {
    return Boolean(lesson && (lesson.attributes.displayName !== '' || lesson.attributes.activities.length > 0));
}