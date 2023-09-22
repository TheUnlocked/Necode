import { SystemConfiguration } from "~database";
import { Entity, EntityType } from "./Entity";

export type ConfigurationEntity
    = Entity<EntityType.Configuration, {
        value: string;
    }>;

export function makeConfigurationEntity(configuration: SystemConfiguration): ConfigurationEntity {
    return {
        type: EntityType.Configuration,
        id: configuration.key,
        attributes: {
            value: configuration.value,
        }
    };
}
