import { TextField } from '@mui/material';
import { PickersDayProps, StaticDatePicker } from '@mui/x-date-pickers';
import { DateTime } from 'luxon';
import { useRouter } from 'next/router';
import { useCallback, useMemo } from 'react';
import { ActivityEntity } from '../../api/entities/ActivityEntity';
import { LessonEntity } from '../../api/entities/LessonEntity';
import { fromLuxon, Iso8601Date, toLuxon } from '../../util/iso8601';
import LessonDatePickerDay from './LessonDatePickerDay';

interface LessonDatePickerProps {
    selectedDate: Iso8601Date;
    lessonsByDate: { [date: Iso8601Date]: LessonEntity<{ activities: 'shallow' }> | undefined };
    onDropActivity?: (activity: ActivityEntity, date: Iso8601Date, copy: boolean) => void;
    onDropLesson?: (lesson: LessonEntity<{ activities: 'deep' }>, date: Iso8601Date, copy: boolean) => void;
}

const views = ["year", "day"] as const;

export default function LessonDatePicker({
    selectedDate,
    lessonsByDate,
    onDropActivity,
    onDropLesson,
}: LessonDatePickerProps) {
    const router = useRouter();

    const renderDay = useCallback((day: DateTime, _: unknown, DayComponentProps: PickersDayProps<DateTime>) => {
        const date = fromLuxon(day);
        const lesson = lessonsByDate[date];
        return <LessonDatePickerDay key={date} pickerProps={DayComponentProps}
            isoDate={date} lesson={lesson}
            onDropActivity={onDropActivity} onDropLesson={onDropLesson} />;
    }, [lessonsByDate, onDropActivity, onDropLesson]);

    return <StaticDatePicker
        value={useMemo(() => toLuxon(selectedDate), [selectedDate])}
        onChange={useCallback((newDate: DateTime | null) => {
            if (newDate) {
                router.push({ hash: fromLuxon(newDate) });
            }
        }, [router])}
        renderInput={props => <TextField {...props} />}
        displayStaticWrapperAs="desktop"
        views={views}
        renderDay={renderDay}/>;
}