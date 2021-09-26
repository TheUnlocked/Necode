import { ClassroomRole, SitewideRights, User } from ".prisma/client";

export enum EntityType {
    User = 'user',
    Classroom = 'classroom'
}

export type EntityId = string;

interface Entity<Type extends EntityType, Data> {
    type: Type;
    id: EntityId;
    attributes: Data;
}

export type EntityReference<E extends Entity<EntityType, any>> = {
    type: E['type'];
    id: EntityId;
} | E;

export function makeEntityReference<E extends Entity<EntityType, any>>(type: E['type'], idOrEntity: string | E): EntityReference<E> {
    if (typeof idOrEntity === 'string') {
        return { type, id: idOrEntity };
    }
    return idOrEntity;
}

/** A curried version of {@link makeEntityReference} */
export function makeEntityReferenceC<E extends Entity<EntityType, any>>(type: E['type']) {
    return (idOrEntity: string | E): EntityReference<E> => {
        if (typeof idOrEntity === 'string') {
            return { type, id: idOrEntity };
        }
        return idOrEntity;
    };
}

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
    classes: (string | ClassroomEntity)[]
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
            classes: relationships.classes.map(makeEntityReferenceC(EntityType.Classroom))
        }
    };
}

export type ClassroomEntity = Entity<EntityType.Classroom, {
    name: string;
    displayName: string;
    members?: EntityReference<ClassroomMemberEntity>[];
}>;

export type ClassroomMemberEntity = UserEntity & Entity<EntityType.User, {
    role: ClassroomRole;
    classroom: EntityReference<ClassroomEntity>;
}>;