import { Alert, Box } from '@mui/material';
import { styled } from '@mui/system';
import { truncate } from 'lodash';
import { useMemo } from 'react';
import { useDragLayer } from 'react-dnd';
import textInputActivityDescription from '../../activities/text-input/textInputDescription';
import { ActivityEntity } from '../../api/entities/ActivityEntity';
import { activityDragDropType } from './ActivityDragDropBox';

const DragLayer = styled('div')`
    position: fixed;
    margin: 0 !important;
    pointer-events: none;
    white-space: nowrap;
    z-index: 10000;
    left: 0;
    top: 0;
    width: 100vw;
    height: 100vh;
`;

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
        if (!item) {
            return null;
        }
        if (item.attributes.activityType === textInputActivityDescription.id) {
            const { language, value } = item.attributes.configuration as typeof textInputActivityDescription['defaultConfig'];
            const text = truncate(value.trim().replaceAll('\n', ' '), { length: 30 });
            return language == null ? text : <code>{text}</code>;
        }
        return truncate(item.attributes.displayName, { length: 30 });
    }, [item]);

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