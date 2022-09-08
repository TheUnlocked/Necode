import { Button, Card, CardContent, IconButton, Paper, Skeleton, Stack, Toolbar, Tooltip, Typography } from "@mui/material";
import { NextPage } from "next";
import { Dispatch, useCallback, useEffect, useMemo, useRef, useState } from "react";
import ActivityListPane from "../../../../src/components/lesson-config/ActivityListPane";
import { LessonEntity } from "../../../../src/api/entities/LessonEntity";
import { useGetRequest, useGetRequestImmutable } from "../../../../src/api/client/GetRequestHook";
import { fromLuxon, Iso8601Date, iso8601DateRegex, toLuxon } from "../../../../src/util/iso8601";
import SkeletonActivityListPane from "../../../../src/components/lesson-config/SkeletonActivityListPane";
import { DateTime } from "luxon";
import { useRouter } from "next/router";
import NotFoundPage from "../../../404";
import { ClassroomMemberEntity } from "../../../../src/api/entities/ClassroomMemberEntity";
import { ContentCopy, Share } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import LessonDatePicker from '../../../../src/components/lesson-config/LessonDatePicker';
import useNecodeFetch from '../../../../src/hooks/useNecodeFetch';
import { ActivityEntity } from '../../../../src/api/entities/ActivityEntity';
import LessonDragLayer from '../../../../src/components/lesson-config/LessonDragLayer';
import useImperativeDialog from '../../../../src/hooks/ImperativeDialogHook';
import LessonMergeDialog from '../../../../src/components/dialogs/LessonMergeDialog';
import isContentfulLesson from '../../../../src/lessons/isContentfulLesson';


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

    const { upload, download } = useNecodeFetch();

    const [joinCode, setJoinCode] = useState<string>();

    useEffect(() => {
        if (classroomId && joinCode === undefined) {
            download<string>(`/api/classroom/${classroomId}/join-code`, { method: 'POST' })
                .then(setJoinCode);
        }
    }, [classroomId, joinCode, download]);

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

    const { data: liveActivityData, mutate: mutateLiveActivityData } = useGetRequest<{
        live: boolean,
        server: string,
        token: string,
    }>(classroomId ? `/api/classroom/${classroomId}/activity/live` : null);

    const endActivity = useCallback(() => {
        upload(`/api/classroom/${classroomId}/activity/live`, { method: 'DELETE' })
            .then(() => mutateLiveActivityData(undefined, true));
    }, [classroomId, upload, mutateLiveActivityData]);

    const goToActivity = useCallback(() => {
        router.push(`/classroom/${classroomId}/activity`);
    }, [router, classroomId]);

    const { enqueueSnackbar } = useSnackbar();

    const copyJoinCodeToKeyboard = useCallback(() => {
        if (joinCode) {
            navigator.clipboard.writeText(joinCode)
                .then(() => enqueueSnackbar('Copied join code to clipboard', { variant: 'success' }))
                .catch(() => enqueueSnackbar('Failed to copy to clipboard', { variant: 'error' }));
        }
    }, [joinCode, enqueueSnackbar]);

    const copyJoinLinkToKeyboard = useCallback(() => {
        if (joinCode) {
            navigator.clipboard.writeText(`${location.origin}/classroom/join?joinCode=${joinCode}`)
                .then(() => enqueueSnackbar('Copied join link to clipboard', { variant: 'success' }))
                .catch(() => enqueueSnackbar('Failed to copy to clipboard', { variant: 'error' }));
        }
    }, [joinCode, enqueueSnackbar]);

    const isActivityRunning = liveActivityData?.live;

    const refreshLessonPaneRef = useRef<() => void>();

    const handleCalendarDropActivity = useCallback(async (activity: ActivityEntity, date: Iso8601Date, copy: boolean) => {
        const lesson = lessonsByDate[date] ?? await upload<LessonEntity<{ activities: 'shallow' }>>(`/api/classroom/${classroomId}/lesson`, {
            method: 'POST',
            body: JSON.stringify({ date, displayName: '' })
        });
        const newActivity = copy
            ? await upload<ActivityEntity>(`/api/classroom/${classroomId}/lesson/${lesson.id}/activity`, {
                method: 'POST',
                body: JSON.stringify({
                    activityType: activity.attributes.activityType,
                    displayName: activity.attributes.displayName,
                    configuration: activity.attributes.configuration,
                    enabledLanguages: activity.attributes.enabledLanguages,
                })
            })
            : await upload<ActivityEntity>(`/api/classroom/${classroomId}/activity/${activity.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ lesson: lesson.id })
            });
        setLessonsByDate(lessonsByDate => ({
            ...lessonsByDate,
            [selectedDate]: copy ? lessonsByDate[selectedDate] : {
                ...lessonsByDate[selectedDate],
                attributes: {
                    ...lessonsByDate[selectedDate]!.attributes,
                    activities: lessonsByDate[selectedDate]!.attributes.activities.filter(x => x.id !== activity.id)
                }
            },
            [date]: {
                ...lesson,
                attributes: {
                    ...lesson.attributes,
                    activities: lesson.attributes.activities.concat(newActivity),
                }
            },
        }));
        if (copy) {
            enqueueSnackbar(`Successfully copied activity to ${toLuxon(date).toLocaleString(DateTime.DATE_FULL)}`, { variant: 'success' });
        }
        else {
            // Can't copy an activity onto the current day's lesson so no need to refresh on copy
            refreshLessonPaneRef.current?.();
        }
    }, [classroomId, selectedDate, lessonsByDate, enqueueSnackbar, upload]);

    const [lessonMergeDialog, openLessonMergeDialog] = useImperativeDialog(LessonMergeDialog, {
        // Default value, overridden when dialog is opened
        copy: false,
    });

    const handleCalendarDropLesson = useCallback(async (lesson: LessonEntity<{ activities: 'deep' }>, date: Iso8601Date, copy: boolean) => {
        let mergeMethod = 'reject';
        const toLesson = lessonsByDate[date];
        if (toLesson) {
            if (isContentfulLesson(toLesson)) {
                mergeMethod = await new Promise<string>(resolve => openLessonMergeDialog({
                    copy,
                    fromLesson: lesson,
                    toLesson,
                    onCommit: resolve,
                }));
            }
            else {
                mergeMethod = 'replace';
            }
            if (copy) {
                // Copying to existing lesson
                const newLesson = await upload<LessonEntity>(`/api/classroom/${classroomId}/lesson/${toLesson.id}?merge=${mergeMethod}`, {
                    method: 'POST',
                    body: JSON.stringify({ lesson: lesson.id })
                });
                setLessonsByDate(lessonsByDate => ({
                    ...lessonsByDate,
                    [date]: newLesson,
                }));
                enqueueSnackbar(`Successfully copied lesson to ${toLuxon(date).toLocaleString(DateTime.DATE_FULL)}`, { variant: 'success' });
                return;
            }
        }
        if (copy) {
            // Copying to new lesson
            const newLesson = await upload<LessonEntity>(`/api/classroom/${classroomId}/lesson`, {
                method: 'POST',
                body: JSON.stringify({
                    date,
                    displayName: lesson.attributes.displayName,
                    activities: lesson.attributes.activities.map(a => ({
                        displayName: a.attributes.displayName,
                        activityType: a.attributes.activityType,
                        configuration: a.attributes.configuration,
                        enabledLanguages: a.attributes.enabledLanguages,
                    })),
                })
            });
            setLessonsByDate(lessonsByDate => ({
                ...lessonsByDate,
                [date]: newLesson,
            }));
            enqueueSnackbar(`Successfully copied lesson to ${toLuxon(date).toLocaleString(DateTime.DATE_FULL)}`, { variant: 'success' });
            return;
        }
        else {
            // Moving to date
            const newLesson = await upload<LessonEntity>(`/api/classroom/${classroomId}/lesson/${lesson.id}?merge=${mergeMethod}`, {
                method: 'PATCH',
                body: JSON.stringify({ date }),
            });
            setLessonsByDate(lessonsByDate => ({
                ...lessonsByDate,
                [date]: newLesson,
                [lesson.attributes.date]: undefined,
            }));
            router.push({ hash: date });
            enqueueSnackbar(`Successfully moved lesson to ${toLuxon(date).toLocaleString(DateTime.DATE_FULL)}`, { variant: 'info' });
        }
    }, [classroomId, router, lessonsByDate, openLessonMergeDialog, enqueueSnackbar, upload]);

    const activityRunningHeader = useMemo(() => isActivityRunning
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
        </Toolbar>
        : undefined, [isActivityRunning, goToActivity, endActivity]);

    const joinCard = useMemo(() => <Card variant="outlined">
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
    </Card>, [joinCode, copyJoinCodeToKeyboard, copyJoinLinkToKeyboard]);

    const listPane = useMemo(() => {
        if (!lessons) {
            return <SkeletonActivityListPane sx={{ flexGrow: 3, height: "100%", display: "flex", flexDirection: "column" }} />;
        }
        return <ActivityListPane sx={{ flexGrow: 3, height: "100%", display: "flex", flexDirection: "column" }}
            classroomId={classroomId!}
            date={selectedDate}
            skeletonActivityCount={lessonsByDate[selectedDate]?.attributes.activities.length ?? 0}
            onLessonChange={onLessonChange}
            refreshRef={refreshLessonPaneRef} />;
    }, [classroomId, lessons, lessonsByDate, selectedDate, onLessonChange]);

    return <>
        {lessonMergeDialog}
        <LessonDragLayer />
        {activityRunningHeader}
        <Stack sx={{
            ...{ '--header-height': isActivityRunning ? '128px' : undefined },
            height: `calc(100vh - var(--header-height))`,
            px: 8,
            py: 4
        }} direction="row" spacing={8}>
            <Stack spacing={4}>
                {joinCard}
                <Paper variant="outlined" sx={{ pt: 2 }}>
                    <LessonDatePicker selectedDate={selectedDate} lessonsByDate={lessonsByDate}
                        onDropActivity={handleCalendarDropActivity}
                        onDropLesson={handleCalendarDropLesson} />
                </Paper>
            </Stack>
            {listPane}
        </Stack>
    </>;
};

export default Page;
