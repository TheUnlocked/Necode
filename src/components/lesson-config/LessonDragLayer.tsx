import { Alert } from '@mui/material';
import { truncate } from 'lodash';
import { useMemo } from 'react';
import { useDragLayer } from 'use-dnd';
import { lessonDragDropType } from '../../dnd/types';
import DragLayer from '../DragLayer';

const MAX_DISPLAY_CHARS = 40;

export default function LessonDragLayer() {
    const { item, position } = useDragLayer(lessonDragDropType, ({ item, event }) => ({
        item: item,
        position: event ? { x: event.clientX, y: event.clientY } : undefined,
    }));

    const displayName = useMemo(() => {
        if (!item) {
            return <em>(unknown lesson)</em>;
        }
        if (!item.attributes.displayName) {
            return <em>(untitled lesson)</em>;
        }
        return truncate(item.attributes.displayName, { length: MAX_DISPLAY_CHARS });
    }, [item]);

    if (!position) {
        return null;
    }

    return <DragLayer>
        <div style={{ position: "absolute", left: position.x, top: position.y }}>
            <Alert variant="filled" severity="success" elevation={8} icon={false}>{displayName}</Alert>
        </div>
    </DragLayer>;
}