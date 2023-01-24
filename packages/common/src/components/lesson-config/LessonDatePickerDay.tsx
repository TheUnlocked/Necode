import { Badge, Tooltip } from '@mui/material';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers';
import { DateTime } from 'luxon';
import { useDrop } from 'use-dnd';
import { ActivityEntity } from 'api/entities/ActivityEntity';
import { LessonEntity } from 'api/entities/LessonEntity';
import { EntityType } from 'api/entities/Entity';
import { activityDragDropType, lessonDragDropType } from '../../dnd/types';
import isContentfulLesson from '../../lessons/isContentfulLesson';
import { Iso8601Date } from '../../util/iso8601';
import { useState } from 'react';

interface LessonDatePickerDayProps {
    pickerProps: PickersDayProps<DateTime>;
    lesson?: LessonEntity<{ activities: 'shallow' }>,
    isoDate: Iso8601Date,
    onDropActivity?: (activity: ActivityEntity, date: Iso8601Date, copy: boolean) => void;
    onDropLesson?: (lesson: LessonEntity<{ activities: 'deep' }>, date: Iso8601Date, copy: boolean) => void;
}

export default function LessonDatePickerDay({
    pickerProps,
    lesson,
    isoDate,
    onDropActivity,
    onDropLesson,
}: LessonDatePickerDayProps) {
    const [copy, setCopy] = useState(false);
    
    const [{ isOver }, drop] = useDrop(() => ({
        accept: [activityDragDropType, lessonDragDropType] as const,
        acceptForeign: false, // TODO: Allow foreign copies
        collect: ({ isOver }) => ({ isOver }),
        hover: ({ event }) => {
            setCopy(Boolean(event?.ctrlKey));
            if (event?.dataTransfer) {
                event.dataTransfer.dropEffect = event.ctrlKey ? 'copy' : 'move';
            }
        },
        drop: ({ item, event }) => {
            if (item.type === EntityType.Activity) {
                onDropActivity?.(item, isoDate, event.ctrlKey);
            }
            else if (item.type === EntityType.Lesson) {
                onDropLesson?.(item, isoDate, event.ctrlKey);
            }
        }
    }), [isoDate, onDropActivity, onDropLesson]);
    
    if (pickerProps.outsideCurrentMonth || pickerProps.selected) {
        return <PickersDay {...pickerProps} />;
    }

    if (!isContentfulLesson(lesson)) {
        return <PickersDay {...pickerProps} ref={drop} selected={isOver}
            sx={{ backgroundColor: ({ palette }) => copy && isOver ? `${palette.success.main} !important` : undefined }} />;
    }
    
    return <Tooltip
        title={lesson.attributes.displayName}
        placement="top" arrow
        disableInteractive> 
        <Badge overlap="circular" variant="dot"
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            componentsProps={{ badge: { style: { right: "50%", pointerEvents: "none" } } }}
            color="primary">
            <PickersDay {...pickerProps} ref={drop} selected={isOver}
                sx={{ backgroundColor: ({ palette }) => copy && isOver ? `${palette.success.main} !important` : undefined }} />
        </Badge>
    </Tooltip>;
}