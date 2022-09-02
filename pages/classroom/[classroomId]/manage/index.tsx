import { PickersDay, StaticDatePicker } from "@mui/x-date-pickers";
import { Badge, Button, Card, CardActions, CardContent, IconButton, Paper, Skeleton, Stack, TextField, Toolbar, Tooltip, Typography } from "@mui/material";
import { NextPage } from "next";
import { Dispatch, useCallback, useEffect, useMemo, useRef, useState } from "react";
import ActivityListPane from "../../../../src/components/lesson-config/ActivityListPane";
import { LessonEntity } from "../../../../src/api/entities/LessonEntity";
import { useGetRequest, useGetRequestImmutable } from "../../../../src/api/client/GetRequestHook";
import { fromLuxon, Iso8601Date, iso8601DateRegex, toLuxon } from "../../../../src/util/iso8601";
import SkeletonActivityListPane from "../../../../src/components/lesson-config/SkeletonActivityListPane";
import { DateTime } from "luxon";
import { useRouter } from "next/router";
import { useLoadingContext } from "../../../../src/api/client/LoadingContext";
import { Response } from "../../../../src/api/Response";
import NotFoundPage from "../../../404";
import { ClassroomMemberEntity } from "../../../../src/api/entities/ClassroomMemberEntity";
import { ContentCopy, Share } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import fetch from '../../../../src/util/fetch';
import LessonDatePicker from '../../../../src/components/lesson-config/LessonDatePicker';


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

    const { data, error, isLoading } = useGetRequestImmutable<ClassroomMemberEntity>(classroomId ? `/api/classroom/${classroomId}/me` : null);

    useEffect(() => {
        if (data?.attributes.role === 'Student') {
            router.replace(`/classroom/${classroomId}/activity`);
        }
    }, [data, router, classroomId]);

    if (!classroomId || isLoading) {
        return null;
    }

    if (typeof classroomId !== 'string' || error) {
        return <NotFoundPage />;
    }

    return <PageContent classroomId={classroomId} />;
}

const PageContent: NextPage<StaticProps> = ({ classroomId }) => {
    const router = useRouter();

    const { startUpload, finishUpload, startDownload, finishDownload } = useLoadingContext();

    const [joinCode, setJoinCode] = useState<string>();

    useEffect(() => {
        if (classroomId && joinCode === undefined) {
            startDownload();
            fetch(`/api/classroom/${classroomId}/join-code`, { method: 'POST' })
                .then(res => res.json() as Promise<Response<string>>)
                .then(res => {
                    if (res.response === 'ok') {
                        setJoinCode(res.data);
                    }
                })
                .finally(finishDownload);
        }
    }, [joinCode, classroomId, startDownload, finishDownload]);

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

    const { enqueueSnackbar } = useSnackbar();

    function copyJoinCodeToKeyboard() {
        if (joinCode) {
            navigator.clipboard.writeText(joinCode)
                .then(() => enqueueSnackbar('Copied join code to clipboard', { variant: 'success' }))
                .catch(() => enqueueSnackbar('Failed to copy to clipboard', { variant: 'error' }));
        }
    }

    function copyJoinLinkToKeyboard() {
        if (joinCode) {
            navigator.clipboard.writeText(`${location.origin}/classroom/join?joinCode=${joinCode}`)
                .then(() => enqueueSnackbar('Copied join link to clipboard', { variant: 'success' }))
                .catch(() => enqueueSnackbar('Failed to copy to clipboard', { variant: 'error' }));
        }
    }

    const isActivityRunning = liveActivityData?.live;

    const listPane = useMemo(() => {
        if (!lessons) {
            return <SkeletonActivityListPane sx={{ flexGrow: 3, height: "100%", display: "flex", flexDirection: "column" }} />;
        }
        return <ActivityListPane sx={{ flexGrow: 3, height: "100%", display: "flex", flexDirection: "column" }}
            classroomId={classroomId!}
            date={selectedDate}
            skeletonActivityCount={lessonsByDate[selectedDate]?.attributes.activities.length ?? 0}
            onLessonChange={onLessonChange} />;
    }, [classroomId, lessons, lessonsByDate, selectedDate, onLessonChange]);

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
                    <Stack direction="row">
                        <CardContent sx={{ px: 3, pt: 3, flexGrow: 1 }}>
                            <Typography variant="body1">Join Code</Typography>
                            {joinCode
                                ? <Typography variant="h3" component="div" sx={{ mt: 1 }}>{joinCode}</Typography>
                                : <Typography variant="h3" component="div" sx={{ mt: 1 }}><Skeleton /></Typography>}
                        </CardContent>
                        {joinCode ? <Stack direction="column" justifyContent="flex-end" spacing={1} sx={{ p: 1 }}>
                            <Tooltip title="Copy Join Code" disableInteractive><IconButton onClick={copyJoinCodeToKeyboard}><ContentCopy/></IconButton></Tooltip>
                            <Tooltip title="Copy Join Link" disableInteractive><IconButton onClick={copyJoinLinkToKeyboard}><Share/></IconButton></Tooltip>
                        </Stack> : undefined}
                    </Stack>
                </Card>
                <Paper variant="outlined" sx={{ pt: 2 }}>
                    <LessonDatePicker selectedDate={selectedDate} lessonsByDate={lessonsByDate} />
                </Paper>
            </Stack>
            {listPane}
        </Stack>
    </>;
};

export default Page;
