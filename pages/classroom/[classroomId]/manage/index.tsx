import { PickersDay, StaticDatePicker } from "@mui/lab";
import { Badge, Stack, TextField, Tooltip } from "@mui/material";
import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { Dispatch, useCallback, useEffect, useRef, useState } from "react";
import { Box } from "@mui/system";
import ActivityListPane from "../../../../src/components/lesson-config/ActivityListPane";
import { LessonEntity } from "../../../../src/api/entities/LessonEntity";
import useGetRequest from "../../../../src/api/client/GetRequestHook";
import { fromLuxon, Iso8601Date, toLuxon } from "../../../../src/util/iso8601";
import SkeletonActivityListPane from "../../../../src/components/lesson-config/SkeletonActivityListPane";
import { DateTime } from "luxon";


interface StaticProps {
    classroomId: string;
}

const Page: NextPage<StaticProps> = ({ classroomId }) => {
    // Normally fromLuxon uses UTC, but we want "today" in the user's timezone
    const [selectedDate, setSelectedDate] = useState<Iso8601Date>(fromLuxon(DateTime.now(), false));

    const { data: lessons } = useGetRequest<LessonEntity[]>(
        classroomId === undefined ? null : `/api/classroom/${classroomId}/lesson`
    );

    const [lessonsByDate, setLessonsByDate] = useState<{ [date: Iso8601Date]: LessonEntity | undefined }>({});

    useEffect(() => {
        if (lessons) {
            setLessonsByDate(Object.fromEntries(lessons.map(x => [x.attributes.date, x])));
        }
    }, [lessons]);

    const onLessonChange: Dispatch<LessonEntity | undefined> = useCallback(newLesson => {
        setLessonsByDate(lessonsByDate => ({
            ...lessonsByDate,
            [selectedDate]: newLesson
        }));
    }, [selectedDate]);

    function isActiveLesson(lesson: LessonEntity | undefined) {
        return Boolean(lesson && (lesson.attributes.displayName !== '' || lesson.attributes.activities.length > 0));
    }

    const saveLessonRef = useRef<() => void>();

    return <Stack sx={{ height: 'calc(100vh - var(--header-height))', px: 8, pb: 8, pt: 4 }} direction="row" alignItems="center" spacing={8}>
        <Box sx={{ pt: 2 }}>
            <StaticDatePicker
                value={toLuxon(selectedDate)}
                onChange={d => {
                    saveLessonRef.current?.();
                    setSelectedDate(d ? fromLuxon(d) : selectedDate);
                }}
                renderInput={params => <TextField {...params} />}
                displayStaticWrapperAs="desktop"
                views={["year", "day"]}
                renderDay={(day, _value, DayComponentProps) => {
                    const isoDate = fromLuxon(day);
                    const todayLesson = lessonsByDate[isoDate];
                    const showsIndicators = isActiveLesson(todayLesson) && !DayComponentProps.selected;
                    return <Tooltip title={showsIndicators ? todayLesson!.attributes.displayName : ''}
                        placement="top" arrow
                    > 
                        <Badge key={isoDate}
                            overlap="circular" variant="dot"
                            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                            componentsProps={{ badge: { style: { right: "50%", pointerEvents: "none" } } }}
                            color="primary"
                            invisible={!showsIndicators}
                        >
                            <PickersDay {...DayComponentProps} />
                        </Badge>
                    </Tooltip>;
                }} />
        </Box>
        {lessons
            ? <ActivityListPane sx={{ flexGrow: 3, height: "100%", display: "flex", flexDirection: "column" }}
                classroomId={classroomId}
                date={selectedDate}
                onLessonChange={onLessonChange}
                saveRef={saveLessonRef} />
            : <SkeletonActivityListPane sx={{ flexGrow: 3, height: "100%", display: "flex", flexDirection: "column" }} />}
    </Stack>;
};

export default Page;

export const getStaticProps: GetStaticProps<StaticProps> = ctx => {
    if (typeof ctx.params?.classroomId !== 'string') {
        return {
            notFound: true
        };
    }

    return {
        props: {
            classroomId: ctx.params.classroomId
        }
    };
};

export const getStaticPaths: GetStaticPaths = async () => {
    return {
        paths: [],
        fallback: true
    };
}