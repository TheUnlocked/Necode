import { Entity, EntityType, EntityId } from "./Entity";


export type ReferenceDepth = 'deep' | 'shallow' | 'none';

export type EntityReference<E extends Entity<EntityType, any>, Type extends ReferenceDepth | undefined = 'shallow'> =
    Type extends 'deep'
    ? E
    : Type extends 'none'
    ? undefined
    : {
        type: E['type'];
        id: EntityId;
    };

export function makeEntityReference<E extends Entity<EntityType, any>, R extends ReferenceDepth | undefined>(
    type: E['type'],
    idOrEntity: string | E | undefined
): EntityReference<E, R>;
export function makeEntityReference<E extends Entity<EntityType, any>>(type: E['type'], idOrEntity: string | E | undefined): EntityReference<E, any> {
    if (typeof idOrEntity === 'string') {
        return { type, id: idOrEntity };
    }
    return idOrEntity;
}

export type EntityReferenceArray<E extends Entity<EntityType, any>, Type extends ReferenceDepth | undefined = 'shallow'> =
    Type extends 'deep'
    ? E[]
    : Type extends 'shallow'
        ? {
            type: E['type'];
            id: EntityId;
        }[]
        : undefined;

export function makeEntityReferenceArray<E extends Entity<EntityType, any>, R extends ReferenceDepth | undefined>(
    type: E['type'],
    idsOrEntities: (string | E)[] | undefined
): EntityReferenceArray<E, R>;
export function makeEntityReferenceArray<E extends Entity<EntityType, any>>(
    type: E['type'],
    idsOrEntities: (string | E)[] | undefined
): EntityReferenceArray<E, any> {
    if (idsOrEntities) {
        return idsOrEntities.map(x => {
            if (typeof x === 'string') {
                return { type, id: x };
            }
            return x;
        });
    }
    return undefined;
}