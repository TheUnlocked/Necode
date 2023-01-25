import { ClassroomMembership, ClassroomRole, User } from "~database";
import { ClassroomEntity } from "./ClassroomEntity";
import { Entity, EntityType } from "./Entity";
import { EntityReference, makeEntityReference, ReferenceDepth } from "./EntityReference";
import { UserEntity, makeUserEntity } from "./UserEntity";


type Refs = { classroom?: ReferenceDepth, classes?: ReferenceDepth };

export type ClassroomMemberEntity<References extends Refs = Refs>
    = Entity<EntityType.ClassroomUser, UserEntity<References>['attributes'] & {
        role: ClassroomRole;
        classroom: EntityReference<ClassroomEntity<any>, References['classroom']>;
    }>;

export function makeClassroomMemberEntity<R extends Refs>(user: ClassroomMembership & { user: User }, relationships?: {
    classes?: (string | ClassroomEntity<any>)[];
    classroom?: string | ClassroomEntity<any>;
}): ClassroomMemberEntity<R> {
    const userPart: UserEntity<R> = makeUserEntity(user.user, { classes: relationships?.classes });
    return {
        type: EntityType.ClassroomUser,
        id: user.userId,
        attributes: {
            ...userPart.attributes,
            role: user.role,
            classroom: makeEntityReference(EntityType.Classroom, relationships?.classroom)
        }
    };
}
