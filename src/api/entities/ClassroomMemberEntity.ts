import { ClassroomMembership, ClassroomRole, User } from ".prisma/client";
import { ClassroomEntity } from "./ClassroomEntity";
import { Entity, EntityType } from "./Entity";
import { EntityReference, makeEntityReference } from "./EntityReference";
import { UserEntity, makeUserEntity } from "./UserEntity";


export type ClassroomMemberEntity = Entity<EntityType.ClassroomUser, UserEntity['attributes'] & {
    role: ClassroomRole;
    classroom: EntityReference<ClassroomEntity>;
}>;

export function makeClassroomMemberEntity(user: ClassroomMembership & { user: User & { classes?: { classroomId: string; }[]; }; }): ClassroomMemberEntity {
    const userPart = makeUserEntity(user.user, { classes: user.user.classes?.map(x => x.classroomId) });
    return {
        type: EntityType.ClassroomUser,
        id: user.userId,
        attributes: {
            ...userPart.attributes,
            role: user.role,
            classroom: makeEntityReference<ClassroomEntity>(EntityType.Classroom, user.classroomId)
        }
    };
}
