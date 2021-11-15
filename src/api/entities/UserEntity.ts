import { SitewideRights, User } from ".prisma/client";
import { Entity, EntityType } from "./Entity";
import { EntityReferenceArray, makeEntityReferenceArray, ReferenceDepth } from "./EntityReference";
import { ClassroomEntity } from "./ClassroomEntity";


type Refs = { classes?: ReferenceDepth };

export type UserEntity<References extends Refs = Refs>
    = Entity<EntityType.User, {
        username: string;
        displayName: string;
        email: string;
        firstName: string;
        lastName: string;
        rights: SitewideRights;
        classes: EntityReferenceArray<ClassroomEntity<any>, References['classes']>;
    }>;

export function makeUserEntity<R extends Refs>(user: User, relationships?: {
    classes?: (string | ClassroomEntity<any>)[];
}): UserEntity<R> {
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
            classes: makeEntityReferenceArray(EntityType.Classroom, relationships?.classes)
        }
    };
}
