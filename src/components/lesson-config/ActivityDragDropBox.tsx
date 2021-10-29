import { Box } from "@mui/system";
import { FC, PropsWithChildren } from "react";
import { ConnectDragSource, useDrag, useDrop } from "react-dnd";
import { compose } from "../../util/fp";

export const activityDragDropType = 'application/lesson-activity+json';

export interface ActivityDragDropData {
    id: string;
}

export interface DraggableComponent extends FC<{
    dragHandle: ConnectDragSource,
    data: ActivityDragDropData
}> {}

export function ActivityDragDropBox({ data, moveItem, findItem, component: Component }: {
    data: ActivityDragDropData,
    moveItem: (id: string, to: number) => void,
    findItem: (id: string) => { index: number },
    component: DraggableComponent
}) {
    const id = data.id;
    const originalIndex = findItem(id).index;

    const [{ isDragging }, drag, dragPreview] = useDrag(() => ({
        type: activityDragDropType,
        item: { id, originalIndex },
        collect: (monitor) => ({
            isDragging: monitor.isDragging()
        }),
        end: (item, monitor) => {
            const { id: droppedId, originalIndex } = item
            const didDrop = monitor.didDrop();
            if (!didDrop) {
                moveItem(droppedId, originalIndex);
            }
        }
    }), [id, originalIndex, moveItem]);

    const [, drop] = useDrop(() => ({
        accept: activityDragDropType,
        canDrop: () => false,
        hover({ id: draggedId }: ActivityDragDropData) {
            if (draggedId !== id) {
                const { index: overIndex } = findItem(id);
                moveItem(draggedId, overIndex);
            }
        }
    }), [id, findItem, moveItem]);

    return <Box ref={compose(drop, dragPreview)} sx={{ opacity: isDragging ? 0 : 1, padding: 1 }}>
        <Component dragHandle={drag} data={data} />
    </Box>;
}
