import { Badge, Tooltip } from '@mui/material';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers';
import { DateTime } from 'luxon';
import { useDrop } from 'react-dnd';
import { ActivityEntity } from '../../api/entities/ActivityEntity';
import { LessonEntity } from '../../api/entities/LessonEntity';
import { EntityType } from '../../api/entities/Entity';
import { activityDragDropType, lessonDragDropType } from '../../dnd/types';
import isContentfulLesson from '../../lessons/isContentfulLesson';
import { Iso8601Date } from '../../util/iso8601';
import { useState } from 'react';
import { useEffect } from 'react';

interface LessonDatePickerDayProps {
    pickerProps: PickersDayProps<DateTime>;
    lesson?: LessonEntity<{ activities: 'shallow' }>,
    isoDate: Iso8601Date,
    onDropActivity?: (activity: ActivityEntity, date: Iso8601Date, copy: boolean) => void;
    onDropLesson?: (lesson: LessonEntity, date: Iso8601Date, copy: boolean) => void;
}

export default function LessonDatePickerDay({ pickerProps, lesson, isoDate, onDropActivity }: LessonDatePickerDayProps) {
    const [copy, setCopy] = useState(false);

    useEffect(() => {
        const handler = (ev: DragEvent) => {
            setCopy(ev.ctrlKey);
        };
        document.addEventListener('drag', handler);
        document.addEventListener('drop', handler);
        return () => {
            document.removeEventListener('drag', handler);
            document.removeEventListener('drop', handler);
        };
    }, []);
    
    const [{ isOver }, drop] = useDrop(() => ({
        accept: [activityDragDropType, lessonDragDropType],
        collect: monitor => ({
            isOver: monitor.isOver(),
        }),
        drop: (item: ActivityEntity | LessonEntity) => {
            if (item.type === EntityType.Activity) {
                onDropActivity?.(item, isoDate, copy);
            }
        }
    }), [isoDate, copy, onDropActivity]);
    
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