import { Alert, Box } from '@mui/material';
import { truncate } from 'lodash';
import { useMemo } from 'react';
import { useDragLayer } from 'use-dnd';
import textInputActivityDescription from '~core/activities/text-input';
import { activityDragDropType } from '../../dnd/types';
import DragLayer from '../DragLayer';

const MAX_DISPLAY_CHARS = 40;

export interface DragIndicatorOptions {
    left: number;
    width: number;
    y: number;
}

interface WidgetDragLayerProps {
    dropIndicatorPos?: DragIndicatorOptions;
}

export default function WidgetDragLayer({ dropIndicatorPos }: WidgetDragLayerProps) {
    const { item, position } = useDragLayer(activityDragDropType, ({ item, event }) => ({
        item: item,
        position: event ? { x: event.clientX, y: event.clientY } : undefined,
    }));

    const widgetDisplayName = useMemo(() => {
        if (!item) {
            return <em>(unknown activity)</em>;
        }
        if (item.attributes.activityType === textInputActivityDescription.id) {
            const { language, value } = item.attributes.configuration as typeof textInputActivityDescription['defaultConfig'];
            const text = truncate(value.trim().replaceAll('\n', ' '), { length: MAX_DISPLAY_CHARS });
            return language == null ? text : <code>{text}</code>;
        }
        return truncate(item.attributes.displayName, { length: MAX_DISPLAY_CHARS });
    }, [item]);

    if (!position) {
        return null;
    }

    return <DragLayer>
        {dropIndicatorPos
            ? <Box sx={{
                position: "absolute",
                border: "2px solid",
                borderColor: "primary.main",
                backgroundColor: "primary.main",
                left: dropIndicatorPos.left,
                width: dropIndicatorPos.width,
                top: dropIndicatorPos.y,
            }} />
            : null}
        <div style={{ position: "absolute", left: position.x, top: position.y }}>
            <Alert variant="filled" severity="info" elevation={8} icon={false}>{widgetDisplayName}</Alert>
        </div>
    </DragLayer>;
}