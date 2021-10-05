import { Classroom } from ".prisma/client";
import { Entity, EntityType } from "./Entity";
import { EntityReference, makeEntityReferenceC } from "./EntityReference";
import { ClassroomMemberEntity } from "./ClassroomMemberEntity";


export type ClassroomEntity = Entity<EntityType.Classroom, {
    name: string;
    displayName: string;
    members?: EntityReference<ClassroomMemberEntity>[];
}>;

export function makeClassroomEntity(classroom: Classroom, relationships: {
    members: (string | ClassroomMemberEntity)[];
}): ClassroomEntity {
    return {
        type: EntityType.Classroom,
        id: classroom.id,
        attributes: {
            name: classroom.name,
            displayName: classroom.displayName,
            members: relationships.members.map(makeEntityReferenceC(EntityType.ClassroomUser))
        }
    };
}
