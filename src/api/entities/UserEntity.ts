import { SitewideRights, User } from ".prisma/client";
import { Entity, EntityType } from "./Entity";
import { EntityReference, makeEntityReferenceC } from "./EntityReference";
import { ClassroomEntity } from "./ClassroomEntity";


export type UserEntity = Entity<EntityType.User, {
    username: string;
    displayName: string;
    email: string;
    firstName: string;
    lastName: string;
    rights: SitewideRights;
    classes?: EntityReference<ClassroomEntity>[];
}>;

export function makeUserEntity(user: User, relationships: {
    classes?: (string | ClassroomEntity)[];
}): UserEntity {
    return {
        type: EntityType.User,
        id: user.id,
        attributes: {
            username: user.username,
            displayName: user.displayName,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            rights: user.rights,
            classes: relationships.classes?.map(makeEntityReferenceC(EntityType.Classroom))
        }
    };
}
