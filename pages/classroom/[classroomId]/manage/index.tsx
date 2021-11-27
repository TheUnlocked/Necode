import { PickersDay, StaticDatePicker } from "@mui/lab";
import { Badge, Button, Card, CardContent, Paper, Skeleton, Stack, TextField, Toolbar, Tooltip, Typography } from "@mui/material";
import { NextPage } from "next";
import { Dispatch, useCallback, useEffect, useRef, useState } from "react";
import ActivityListPane from "../../../../src/components/lesson-config/ActivityListPane";
import { LessonEntity } from "../../../../src/api/entities/LessonEntity";
import useGetRequest from "../../../../src/api/client/GetRequestHook";
import { fromLuxon, Iso8601Date, iso8601DateRegex, toLuxon } from "../../../../src/util/iso8601";
import SkeletonActivityListPane from "../../../../src/components/lesson-config/SkeletonActivityListPane";
import { DateTime } from "luxon";
import { useRouter } from "next/router";
import { useLoadingContext } from "../../../../src/api/client/LoadingContext";
import { Response } from "../../../../src/api/Response";
import NotFoundPage from "../../../404";


function getDateFromPath(path: string) {
    const [, hash] = path.split('#', 2);
    if (hash && iso8601DateRegex.test(hash)) {
        return hash as Iso8601Date;
    }
    return null;
}

interface StaticProps {
    classroomId?: string;
}

const Page: NextPage = () => {
    const router = useRouter();
    const classroomId = router.query.classroomId;

    if (!classroomId) {
        return null;
    }

    if (typeof classroomId !== 'string') {
        return <NotFoundPage />;
    }
    return <PageContent classroomId={classroomId} />;
}

const PageContent: NextPage<StaticProps> = ({ classroomId }) => {
    const router = useRouter();

    const { startUpload, finishUpload } = useLoadingContext();

    const [joinCode, setJoinCode] = useState<string>();

    useEffect(() => {
        if (classroomId && joinCode === undefined) {
            startUpload();
            fetch(`/api/classroom/${classroomId}/join-code`, { method: 'POST' })
                .then(res => res.json() as Promise<Response<string>>)
                .then(res => {
                    if (res.response === 'ok') {
                        setJoinCode(res.data);
                    }
                })
                .finally(finishUpload);
        }
    }, [joinCode, classroomId, startUpload, finishUpload]);

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

    function endActivity() {
        startUpload();
        fetch(`/api/classroom/${classroomId}/activity/live`, { method: 'DELETE' })
            .then(() => mutateLiveActivityData(undefined, true))
            .finally(finishUpload);
    }

    function goToActivity() {
        router.push(`/classroom/${classroomId}/activity`);
    }

    const { data: liveActivityData, mutate: mutateLiveActivityData } = useGetRequest<{
        live: boolean,
        server: string,
        token: string
    }>(classroomId ? `/api/classroom/${classroomId}/activity/live` : null);

    const isActivityRunning = liveActivityData?.live;

    return <>
        {isActivityRunning
            ? <Toolbar sx={{
                height: 64,
                backgroundColor: 'success.dark',
                justifyContent: "center"
            }}>
                <Stack direction="row" spacing={1}>
                    <Typography variant="h6">
                        An activity is currently running.    
                    </Typography>
                    <Button color="primary" variant="contained" onClick={goToActivity}>Go To Activity</Button>
                    <Button color="error" variant="contained" onClick={endActivity}>End Activity</Button>
                </Stack>
            </Toolbar> : undefined}
        <Stack sx={{
            ...{ '--header-height': isActivityRunning ? '128px' : undefined },
            height: `calc(100vh - var(--header-height))`,
            px: 8,
            py: 4
        }} direction="row" spacing={8}>
            <Stack spacing={4}>
                <Card variant="outlined">
                    <CardContent sx={{ px: 3, pt: 3 }}>
                        <Typography variant="body1">Join Code</Typography>
                        {joinCode
                            ? <Typography variant="h3" component="div" sx={{ mt: 1 }}>{joinCode}</Typography>
                            : <Typography variant="h3" component="div" sx={{ mt: 1 }}><Skeleton /></Typography>}
                    </CardContent>
                </Card>
                <Paper variant="outlined" sx={{ pt: 2 }}>
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
                </Paper>
            </Stack>
            {lessons
                ? <ActivityListPane sx={{ flexGrow: 3, height: "100%", display: "flex", flexDirection: "column" }}
                    classroomId={classroomId!}
                    date={selectedDate}
                    onLessonChange={onLessonChange}
                    saveRef={saveLessonRef} />
                : <SkeletonActivityListPane sx={{ flexGrow: 3, height: "100%", display: "flex", flexDirection: "column" }} />}
        </Stack>
    </>;
};

export default Page;
