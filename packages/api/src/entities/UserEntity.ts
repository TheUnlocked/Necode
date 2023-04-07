import { SitewideRights, User } from "~database";
import { Entity, EntityType } from "./Entity";
import { EntityReferenceArray, makeEntityReferenceArray, ReferenceDepth } from "./EntityReference";
import { ClassroomEntity } from "./ClassroomEntity";


export type UserEntityRefs = { classes?: ReferenceDepth, simulatedUsers?: ReferenceDepth };

export type UserEntity<References extends UserEntityRefs = UserEntityRefs>
    = Entity<EntityType.User, {
        username: string;
        displayName: string;
        email: string;
        firstName: string;
        lastName: string;
        rights: SitewideRights;
        classes: EntityReferenceArray<ClassroomEntity<any>, References['classes']>;
        simulatedUsers: EntityReferenceArray<UserEntity<any>, References['simulatedUsers']>;
    }>;

export function makeUserEntity<R extends UserEntityRefs>(user: User, relationships?: {
    classes?: (string | ClassroomEntity<any>)[];
    simulatedUsers?: (string | UserEntity<any>)[];
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
            classes: makeEntityReferenceArray(EntityType.Classroom, relationships?.classes),
            simulatedUsers: makeEntityReferenceArray(EntityType.User, relationships?.simulatedUsers),
        }
    };
}
