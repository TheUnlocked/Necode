import { pickBy } from "lodash";
import { Entity, EntityType } from "~api/entities/Entity";

export default function getChangedEntityAttributes<D extends object, T extends Entity<EntityType, D>>(original: T, updated: T) {
    return pickBy(updated.attributes, (v, k) => typeof v !== 'object' && v !== original.attributes[k as keyof D]);
}