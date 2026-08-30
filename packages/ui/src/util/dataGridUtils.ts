import { Entity, EntityType } from "~api/entities/Entity";
import { GridColDef } from "@mui/x-data-grid";

export function entityAttributeColumn<E extends Entity<EntityType, {}>>(
    attributeName: E extends Entity<EntityType, infer A> ? keyof A : never,
    props: Partial<GridColDef<E>>
): GridColDef<E> {
    return {
        field: attributeName,
        valueGetter: (_, row) => {
            return row.attributes[attributeName];
        },
        valueSetter: (value, row) => {
            return {
                ...row,
                attributes: {
                    ...row.attributes,
                    [attributeName]: value,
                },
            };
        },
        ...props,
    };
}
