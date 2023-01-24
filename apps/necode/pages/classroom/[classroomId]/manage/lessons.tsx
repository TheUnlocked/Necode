import { Paper } from "@mui/material";
import { NextPage } from "next";
import { Dispatch, useCallback, useEffect, useMemo, useRef, useState } from "react";
import ActivityListPane from "common/components/lesson-config/ActivityListPane";
import { LessonEntity } from "api/entities/LessonEntity";
import { useGetRequest } from "common/api/client/GetRequestHook";
import { fromLuxon, Iso8601Date, iso8601DateRegex, toLuxon } from "common/util/iso8601";
import SkeletonActivityListPane from "common/components/lesson-config/SkeletonActivityListPane";
import { DateTime } from "luxon";
import { useRouter } from "next/router";
import { useSnackbar } from "notistack";
import LessonDatePicker from 'common/components/lesson-config/LessonDatePicker';
import useNecodeFetch from 'common/hooks/useNecodeFetch';
import { ActivityEntity } from 'api/entities/ActivityEntity';
import LessonDragLayer from 'common/components/lesson-config/LessonDragLayer';
import useImperativeDialog from 'common/hooks/useImperativeDialog';
import LessonMergeDialog from 'common/components/dialogs/LessonMergeDialog';
import isContentfulLesson from 'common/lessons/isContentfulLesson';
import ManageClassroomPage, { ManageClassroomPageContentProps } from 'common/components/layouts/ManageClassroomPage';


function getDateFromPath(path: string) {
    const [, hash] = path.split('#', 2);
    if (hash && iso8601DateRegex.test(hash)) {
        return hash as Iso8601Date;
    }
    return null;
}

const Page: NextPage = () => {
    return <ManageClassroomPage page="lessons" component={PageContent} />;
};

const PageContent: NextPage<ManageClassroomPageContentProps> = ({ classroomId }) => {
    const router = useRouter();

    const { upload } = useNecodeFetch();

    // Normally fromLuxon uses UTC, but for the default we want "today" in the user's timezone
    const [selectedDate, setSelectedDate] = useState(fromLuxon(DateTime.now(), false));

    useEffect(() => {
        const date = getDateFromPath(router.asPath);
        if (date) {
            setSelectedDate(date);
        }
    }, [router.asPath]);

    const { data: lessons } = useGetRequest<LessonEntity<{ activities: 'shallow' }>[]>(
        classroomId === undefined ? null : `/api/classroom/${classroomId}/lesson`,
        { revalidateOnFocus: false }
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

    const { enqueueSnackbar } = useSnackbar();

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
        <Paper variant="outlined" sx={{ pt: 2 }}>
            <LessonDatePicker selectedDate={selectedDate} lessonsByDate={lessonsByDate}
                onDropActivity={handleCalendarDropActivity}
                onDropLesson={handleCalendarDropLesson} />
        </Paper>
        {listPane}
    </>;
};

export default Page;
