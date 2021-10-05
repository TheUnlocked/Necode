import { Entity, EntityType, EntityId } from "./Entity";


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
