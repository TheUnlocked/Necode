import { Badge, TextField, Tooltip } from '@mui/material';
import { PickersDay, PickersDayProps, StaticDatePicker } from '@mui/x-date-pickers';
import { DateTime } from 'luxon';
import { useRouter } from 'next/router';
import { useCallback, useMemo } from 'react';
import { LessonEntity } from '../../api/entities/LessonEntity';
import { fromLuxon, Iso8601Date, toLuxon } from '../../util/iso8601';

function isContentfulLesson(lesson: LessonEntity<{ activities: 'shallow' }> | undefined): lesson is LessonEntity<{ activities: 'shallow' }> {
    return Boolean(lesson && (lesson.attributes.displayName !== '' || lesson.attributes.activities.length > 0));
}

interface LessonDatePickerProps {
    selectedDate: Iso8601Date;
    lessonsByDate: { [date: Iso8601Date]: LessonEntity<{ activities: 'shallow' }> | undefined };
}

const views = ["year", "day"] as const;

function Day(props: PickersDayProps<DateTime> & {
    lesson?: LessonEntity<{ activities: 'shallow' }>,
    isoDate: string,
}) {
    if (props.outsideCurrentMonth || props.selected || !isContentfulLesson(props.lesson)) {
        return <PickersDay {...props} />;
    }
    return <Tooltip key={props.key}
        title={props.lesson.attributes.displayName}
        placement="top" arrow
        disableInteractive> 
        <Badge key={props.isoDate}
            overlap="circular" variant="dot"
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            componentsProps={{ badge: { style: { right: "50%", pointerEvents: "none" } } }}
            color="primary">
            <PickersDay {...props} />
        </Badge>
    </Tooltip>;
}

export default function LessonDatePicker({ selectedDate, lessonsByDate }: LessonDatePickerProps) {
    const router = useRouter();

    const renderDay = useCallback((day: DateTime, _, DayComponentProps: PickersDayProps<DateTime>) => {
        const isoDate = fromLuxon(day);
        const lesson = lessonsByDate[isoDate];
        return <Day {...DayComponentProps} isoDate={isoDate} lesson={lesson} />;
    }, [lessonsByDate]);

    return <StaticDatePicker
        value={useMemo(() => toLuxon(selectedDate), [selectedDate])}
        onChange={useCallback((newDate: DateTime | null) => {
            if (newDate) {
                router.push({ hash: fromLuxon(newDate) });
            }
        }, [router])}
        renderInput={TextField}
        displayStaticWrapperAs="desktop"
        views={views}
        renderDay={renderDay}/>;
}