import { PickersDay, StaticDatePicker } from "@mui/lab";
import { Badge, Stack, TextField, Tooltip } from "@mui/material";
import { GetServerSideProps, NextPage } from "next";
import { Dispatch, useCallback, useEffect, useRef, useState } from "react";
import { Box } from "@mui/system";
import ActivityListPane from "../../../../src/components/lesson-config/ActivityListPane";
import { LessonEntity } from "../../../../src/api/entities/LessonEntity";
import useGetRequest from "../../../../src/api/client/GetRequestHook";
import { fromLuxon, Iso8601Date, iso8601DateRegex, toLuxon } from "../../../../src/util/iso8601";
import SkeletonActivityListPane from "../../../../src/components/lesson-config/SkeletonActivityListPane";
import { DateTime } from "luxon";
import { useRouter } from "next/router";


function getDateFromPath(path: string) {
    const [, hash] = path.split('#', 2);
    if (hash && iso8601DateRegex.test(hash)) {
        return hash as Iso8601Date;
    }
    return null;
}

interface StaticProps {
    classroomId: string;
}

const Page: NextPage<StaticProps> = ({ classroomId }) => {
    const router = useRouter();

    // Normally fromLuxon uses UTC, but for the default we want "today" in the user's timezone
    const [selectedDate, setSelectedDate] = useState(fromLuxon(DateTime.now(), false));

    useEffect(() => {
        const date = getDateFromPath(router.asPath);
        if (date) {
            setSelectedDate(date);
        }
    }, [router.asPath]);

    const { data: lessons } = useGetRequest<LessonEntity<{ activities: 'shallow' }>[]>(
        classroomId === undefined ? null : `/api/classroom/${classroomId}/lesson`
    );

    const [lessonsByDate, setLessonsByDate] = useState<{ [date: Iso8601Date]: LessonEntity<{ activities: 'shallow' }> | undefined }>({});

    useEffect(() => {
        if (lessons) {
            setLessonsByDate(Object.fromEntries(lessons.map(x => [x.attributes.date, x])));
        }
    }, [lessons]);

    const onLessonChange: Dispatch<LessonEntity<{ activities: 'shallow' }> | undefined> = useCallback(newLesson => {
        setLessonsByDate(lessonsByDate => ({
            ...lessonsByDate,
            [selectedDate]: newLesson
        }));
    }, [selectedDate]);

    function isActiveLesson(lesson: LessonEntity<{ activities: 'shallow' }> | undefined) {
        return Boolean(lesson && (lesson.attributes.displayName !== '' || lesson.attributes.activities.length > 0));
    }

    const saveLessonRef = useRef<() => void>();

    useEffect(() => {
        saveLessonRef.current?.();
    }, []);

    return <Stack sx={{ height: 'calc(100vh - var(--header-height))', px: 8, pb: 8, pt: 4 }} direction="row" alignItems="center" spacing={8}>
        <Box sx={{ pt: 2 }}>
            <StaticDatePicker
                value={toLuxon(selectedDate)}
                onChange={newDate => {
                    saveLessonRef.current?.();
                    if (newDate) {
                        router.push({ hash: fromLuxon(newDate) });
                    }
                }}
                renderInput={params => <TextField {...params} />}
                displayStaticWrapperAs="desktop"
                views={["year", "day"]}
                renderDay={(day, _value, DayComponentProps) => {
                    const isoDate = fromLuxon(day);
                    const todayLesson = lessonsByDate[isoDate];
                    const showsIndicators = isActiveLesson(todayLesson) && !DayComponentProps.selected;
                    return <Tooltip key={DayComponentProps.key}
                        title={showsIndicators ? todayLesson!.attributes.displayName : ''}
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

export const getServerSideProps: GetServerSideProps<StaticProps> = async ctx => {
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
