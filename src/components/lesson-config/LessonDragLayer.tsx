import { Alert } from '@mui/material';
import { truncate } from 'lodash';
import { useMemo } from 'react';
import { useDragLayer } from 'react-dnd';
import { LessonEntity } from '../../api/entities/LessonEntity';
import { lessonDragDropType } from '../../dnd/types';
import DragLayer from '../DragLayer';

const MAX_DISPLAY_CHARS = 40;

export default function LessonDragLayer() {
    const { isDragging, itemType, item, position } = useDragLayer(monitor => ({
        item: monitor.getItem() as LessonEntity | undefined,
        itemType: monitor.getItemType(),
        position: monitor.getClientOffset(),
        isDragging: monitor.isDragging(),
    }));

    const displayName = useMemo(() => {
        if (!item || itemType !== lessonDragDropType) {
            return null;
        }
        if (!item.attributes.displayName) {
            return <em>(untitled lesson)</em>;
        }
        return truncate(item.attributes.displayName, { length: MAX_DISPLAY_CHARS });
    }, [item, itemType]);

    if (!isDragging || itemType !== lessonDragDropType || !position || !item) {
        return null;
    }

    return <DragLayer>
        <div style={{ position: "absolute", left: position.x, top: position.y }}>
            <Alert variant="filled" severity="success" elevation={8} icon={false}>{displayName}</Alert>
        </div>
    </DragLayer>;
}