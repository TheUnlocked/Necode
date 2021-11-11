import { Box } from "@mui/system";
import { ComponentType, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import ActivityDescription, { ActivityConfigWidgetProps } from "../../activities/ActivityDescription";
import { ActivityEntity } from "../../api/entities/ActivityEntity";
import LanguageDescription from "../../languages/LangaugeDescription";
import { compose } from "../../util/fp";
import DefaultActivityWidget from "./DefaultActivityWidget";

export const activityDragDropType = 'application/lesson-activity+json';

export type DraggableComponent = ComponentType<ActivityConfigWidgetProps<any>>;

interface ActivityDragDropBoxProps {
    activity: ActivityDescription<any>,
    id: string;
    classroom: string;
    activityConfig: any;
    onActivityConfigChange: (newConfig: any) => void;
    moveItem: (id: string, to: number) => void,
    findItem: (id: string) => { index: number },
}

export function ActivityDragDropBox({
    activity,
    id,
    classroom,
    activityConfig,
    onActivityConfigChange,
    moveItem,
    findItem
}: ActivityDragDropBoxProps) {
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

    const [, drop] = useDrop<ActivityEntity, unknown, unknown>(() => ({
        accept: activityDragDropType,
        canDrop: () => false,
        hover({ id: draggedId }) {
            if (draggedId !== id) {
                const { index: overIndex } = findItem(id);
                moveItem(draggedId, overIndex);
            }
        }
    }), [id, findItem, moveItem]);

    const Widget = activity.configWidget ?? DefaultActivityWidget;

    return <Box ref={compose(drop, dragPreview)} sx={{ opacity: isDragging ? 0 : 1, padding: 1 }}>
        <Widget
            id={id}
            classroom={classroom}
            activityConfig={activityConfig}
            onActivityConfigChange={onActivityConfigChange}
            dragHandle={drag} />
    </Box>;
}
