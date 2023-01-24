export enum EntityType {
    User = 'user',
    /** inherits from user */
    ClassroomUser = 'user/classroom',
    Classroom = 'classroom',
    Lesson = 'lesson',
    Activity = 'activity',
    ActivitySubmission = 'submission',
}

export type EntityId = string;
export interface Entity<Type extends EntityType, Data> {
    type: Type;
    id: EntityId;
    attributes: Data;
}
