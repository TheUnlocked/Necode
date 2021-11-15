import { Classroom } from ".prisma/client";
import { Entity, EntityType } from "./Entity";
import { EntityReferenceArray, makeEntityReferenceArray, ReferenceDepth } from "./EntityReference";
import { ClassroomMemberEntity } from "./ClassroomMemberEntity";


type Refs = { members?: ReferenceDepth };

export type ClassroomEntity<References extends Refs = Refs>
    = Entity<EntityType.Classroom, {
        displayName: string;
        members: EntityReferenceArray<ClassroomMemberEntity<any>, References['members']>;
    }>;

export function makeClassroomEntity<R extends Refs = any>(classroom: Classroom, relationships?: {
    members?: (string | ClassroomMemberEntity<any>)[];
}): ClassroomEntity<R> {
    return {
        type: EntityType.Classroom,
        id: classroom.id,
        attributes: {
            displayName: classroom.displayName,
            members: makeEntityReferenceArray(EntityType.ClassroomUser, relationships?.members)
        }
    };
}
