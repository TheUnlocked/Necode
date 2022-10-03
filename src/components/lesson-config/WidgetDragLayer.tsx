import { Alert, Box } from '@mui/material';
import { truncate } from 'lodash';
import { useMemo } from 'react';
import { useDragLayer } from 'react-dnd';
import textInputActivityDescription from '../../activities/text-input/textInputDescription';
import { ActivityEntity } from '../../api/entities/ActivityEntity';
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
    const { isDragging, itemType, item, position } = useDragLayer(monitor => ({
        item: monitor.getItem() as ActivityEntity | undefined,
        itemType: monitor.getItemType(),
        position: monitor.getClientOffset(),
        isDragging: monitor.isDragging(),
    }));

    const widgetDisplayName = useMemo(() => {
        if (!item || itemType !== activityDragDropType) {
            return null;
        }
        if (item.attributes.activityType === textInputActivityDescription.id) {
            const { language, value } = item.attributes.configuration as typeof textInputActivityDescription['defaultConfig'];
            const text = truncate(value.trim().replaceAll('\n', ' '), { length: MAX_DISPLAY_CHARS });
            return language == null ? text : <code>{text}</code>;
        }
        return truncate(item.attributes.displayName, { length: MAX_DISPLAY_CHARS });
    }, [item, itemType]);

    if (!isDragging || itemType !== activityDragDropType || !position || !item) {
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