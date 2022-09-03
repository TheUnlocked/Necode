import { Badge, Tooltip } from '@mui/material';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers';
import { DateTime } from 'luxon';
import { useDrop } from 'react-dnd';
import { ActivityEntity } from '../../api/entities/ActivityEntity';
import { LessonEntity } from '../../api/entities/LessonEntity';
import { Iso8601Date } from '../../util/iso8601';
import { activityDragDropType } from './ActivityDragDropBox';

function isContentfulLesson(lesson: LessonEntity<{ activities: 'shallow' }> | undefined): lesson is LessonEntity<{ activities: 'shallow' }> {
    return Boolean(lesson && (lesson.attributes.displayName !== '' || lesson.attributes.activities.length > 0));
}

interface LessonDatePickerDayProps {
    pickerProps: PickersDayProps<DateTime>;
    lesson?: LessonEntity<{ activities: 'shallow' }>,
    isoDate: Iso8601Date,
    onDropActivity?: (activity: ActivityEntity, date: Iso8601Date) => void;
}

export default function LessonDatePickerDay({ pickerProps, lesson, isoDate, onDropActivity }: LessonDatePickerDayProps) {
    const [{ isOver }, drop] = useDrop(() => ({
        accept: activityDragDropType,
        collect: monitor => ({
            isOver: monitor.isOver(),
        }),
        drop: (item: ActivityEntity) => {
            onDropActivity?.(item, isoDate);
        }
    }), [isoDate, onDropActivity]);
    
    if (pickerProps.outsideCurrentMonth || pickerProps.selected) {
        return <PickersDay {...pickerProps} />;
    }

    if (!isContentfulLesson(lesson)) {
        return <PickersDay {...pickerProps} ref={drop} selected={isOver} />;
    }

    return <Tooltip
        title={lesson.attributes.displayName}
        placement="top" arrow
        disableInteractive> 
        <Badge overlap="circular" variant="dot"
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            componentsProps={{ badge: { style: { right: "50%", pointerEvents: "none" } } }}
            color="primary">
            <PickersDay {...pickerProps} ref={drop} selected={isOver} />
        </Badge>
    </Tooltip>;
}