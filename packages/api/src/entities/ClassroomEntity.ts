import { Classroom } from "~database";
import { Entity, EntityType } from "./Entity";
import { EntityReferenceArray, makeEntityReferenceArray, ReferenceDepth } from "./EntityReference";
import { ClassroomMemberEntity } from "./ClassroomMemberEntity";
import { LessonEntity } from "./LessonEntity";


type Refs = { members?: ReferenceDepth, lessons?: ReferenceDepth };

export type ClassroomEntity<References extends Refs = Refs>
    = Entity<EntityType.Classroom, {
        displayName: string;
        members: EntityReferenceArray<ClassroomMemberEntity, References['members']>;
        lessons: EntityReferenceArray<LessonEntity, References['lessons']>;
    }>;

export function makeClassroomEntity<R extends Refs = any>(classroom: Classroom, relationships?: {
    members?: (string | ClassroomMemberEntity)[];
    lessons?: (string | LessonEntity)[];
}): ClassroomEntity<R> {
    return {
        type: EntityType.Classroom,
        id: classroom.id,
        attributes: {
            displayName: classroom.displayName,
            members: makeEntityReferenceArray(EntityType.ClassroomUser, relationships?.members),
            lessons: makeEntityReferenceArray(EntityType.Lesson, relationships?.lessons)
        }
    };
}
