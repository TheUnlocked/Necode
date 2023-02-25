import { Plugin } from "~database";
import { Entity, EntityType } from "./Entity";

export type PluginEntity
    = Entity<EntityType.Plugin, {
        name: string;
        displayName: string;
        version: string;
        entry?: string;
    }>;

export function makePluginEntity(plugin: Plugin): PluginEntity {
    return {
        type: EntityType.Plugin,
        id: plugin.id,
        attributes: {
            name: plugin.name,
            displayName: plugin.displayName,
            version: plugin.version,
            entry: plugin.entryFilename === undefined ? undefined : `/api/plugin/${plugin.id}/files/${plugin.version}/${plugin.entryFilename}`,
        }
    };
}
