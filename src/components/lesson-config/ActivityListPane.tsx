import { Add, Delete, TextFields } from "@mui/icons-material";
import { Button, Card, CardContent, Divider, IconButton, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { Box, SxProps } from "@mui/system";
import { nanoid } from "nanoid";
import { Dispatch, MutableRefObject, useCallback, useEffect, useRef, useState } from "react";
import { useDrop } from "react-dnd";
import ActivityDescription from "../../activities/ActivityDescription";
import allActivities from "../../activities/allActivities";
import testBasedActivityDescription from "../../activities/html-test-based";
import { useGetRequest } from "../../api/client/GetRequestHook";
import { useLoadingContext } from "../../api/client/LoadingContext";
import { ActivityEntity } from "../../api/entities/ActivityEntity";
import { LessonEntity } from "../../api/entities/LessonEntity";
import { Response } from "../../api/Response";
import useDirty from "../../hooks/DirtyHook";
import { useMergeReducer } from "../../hooks/MergeReducerHook";
import { Iso8601Date, toLuxon } from "../../util/iso8601";
import { ActivityDragDropBox, activityDragDropType } from "./ActivityDragDropBox";
import SkeletonActivityListPane from "./SkeletonActivityListPane";
import BrokenWidget from "./BrokenWidget";
import NoopActivity from "./NoopActivity";
import textInputActivityDescription from "./textInputDescription";
import useImperativeDialog from "../../hooks/ImperativeDialogHook";
import SelectActivityDialog from "./SelectActivityDialog";
import { AttributesOf } from "../../api/Endpoint";

export interface LocalActivity {
    id: string;
    activityType: ActivityDescription<any>;
    configuration: any;
    enabledLanguages: string[];
}

type LocalActivityReference = (LocalActivity & { isReference?: false }) | ({ id: string, isReference: true } & Partial<LocalActivity>);

function activityEntityToLocal(entity: ActivityEntity): LocalActivity {
    let activity = entity.attributes.activityType === textInputActivityDescription.id
        ? textInputActivityDescription
        : allActivities.find(x => x.id === entity.attributes.activityType);

    if (!activity) {
        activity = {
            id: entity.attributes.activityType,
            displayName: 'Unknown Activity',
            defaultConfig: undefined,
            supportedFeatures: [],
            activityPage: NoopActivity,
            configWidget: BrokenWidget
        };
    }

    return {
        id: entity.id,
        activityType: activity,
        configuration: entity.attributes.configuration,
        enabledLanguages: entity.attributes.enabledLanguages
    };
}

interface ActivityListPaneProps {
    sx: SxProps;
    date: Iso8601Date;
    classroomId: string;
    onLessonChange?: Dispatch<LessonEntity<{ activities: 'shallow' }> | undefined>;
    saveRef?: MutableRefObject<(() => void) | undefined>;
}

export default function ActivityListPane({
    sx,
    classroomId,
    date,
    onLessonChange,
    saveRef: foreignSaveRef
}: ActivityListPaneProps) {
    const onLessonChangeRef = useRef(onLessonChange);
    useEffect(() => void (onLessonChangeRef.current = onLessonChange), [onLessonChange]);
    
    const [isDirty, markDirty, clearDirty, dirtyCounter] = useDirty();

    const isDirtyRef = useRef(false);
    useEffect(() => {
        isDirtyRef.current = isDirty;
    }, [isDirty]);

    const [, drop] = useDrop(() => ({ accept: activityDragDropType }));

    const [{ isDragging }, trashDrop] = useDrop(() => ({
        accept: activityDragDropType,
        collect(monitor) {
            return {
                isDragging: Boolean(monitor.getItemType() === activityDragDropType)
            };
        },
        drop(item: LocalActivity) {
            markDirty();
            setActivities(activities => activities.filter(x => x.id !== item.id));
        }
    }));

    async function addActivity(activity: ActivityDescription<any>) {
        const id = `%local_${nanoid()}`;
        setActivities(x => {
            const newActivities = x.concat({
                id,
                isReference: false,
                activityType: activity,
                configuration: activity.defaultConfig,
                enabledLanguages: []
            });
            return newActivities;
        });
        markDirty();
    }

    const [activities, setActivities] = useState<LocalActivityReference[]>([]);

    const lessonEndpoint = `/api/classroom/${classroomId}/lesson/${date}?include=activities`;
    const { data: lessonEntity, error: lessonEntityError, isLoading } = useGetRequest<LessonEntity<{ activities: 'deep', classroom: 'shallow' }>>(lessonEndpoint, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false
    });

    const [{ id: lessonId, displayName }, modifyActivity] = useMergeReducer<{
        id: string | undefined,
        displayName: string
    }>({ id: undefined, displayName: '' });

    useEffect(() => {
        if (lessonEntity) {
            onLessonChangeRef.current?.(lessonEntity);
            modifyActivity({ id: lessonEntity.id, displayName: lessonEntity.attributes.displayName });
            setActivities(lessonEntity.attributes.activities.map(activityEntityToLocal));

            clearDirty();
        }
        else if (lessonEntityError) {
            onLessonChangeRef.current?.(undefined);
            modifyActivity({ id: undefined, displayName: '' });
            setActivities([]);

            clearDirty();
        }
    }, [lessonEntity, lessonEntityError]);

    const { startUpload, finishUpload } = useLoadingContext();

    const save = useCallback(() => {
        if (isLoading) {
            // can't save while loading
            return;
        }

        if (!classroomId) {
            return;
        }

        if (activities.length === 0 && displayName === '') {
            if (lessonId) {
                // Delete lesson
                onLessonChange?.(undefined);
                clearDirty();
                startUpload();
                return fetch(`/api/classroom/${classroomId}/lesson/${lessonId}`, { method: 'DELETE' })
                    .then(() => {})
                    .finally(finishUpload);
            }
            return;
        }

        startUpload();
                    
        const body = JSON.stringify({
            date,
            displayName,
            activities: activities.map(x => ({
                id: x.id.startsWith('%local') ? undefined : x.id,
                activityType: x.activityType?.id,
                configuration: x.configuration,
                enabledLanguages: x.enabledLanguages
            }))
        } as AttributesOf<LessonEntity<{ activities: 'deep' }>>);

        let req: Promise<Response<LessonEntity<{ activities: 'deep', classroom: 'shallow' }>>>;
        
        if (lessonId) {
            req = fetch(`/api/classroom/${classroomId}/lesson/${lessonId}`, {
                method: 'PUT',
                body
            }).then(x => x.json());
        }
        else {
            req = fetch(`/api/classroom/${classroomId}/lesson`, {
                method: 'POST',
                body
            }).then(x => x.json());
        }

        clearDirty();
        return req
            .then(x => {
                onLessonChange?.(x.data);
                return x.data;
            })
            .finally(finishUpload);
    }, [date, classroomId, lessonId, displayName, activities, isLoading, onLessonChange, startUpload, finishUpload]);

    const saveRef = useRef(save);
    useEffect(() => {
        saveRef.current = save;
        if (foreignSaveRef) {
            foreignSaveRef.current = () => {
                if (isDirtyRef.current) {
                    save();
                }
            }
        }
    }, [save, foreignSaveRef]);

    useEffect(() => {
        if (dirtyCounter) {
            const timer = setTimeout(saveRef.current, 3000);
            return () => clearTimeout(timer);
        }
    }, [dirtyCounter]);

    const findItem = useCallback((id: string) => {
        return { index: activities.findIndex(x => x.id === id) };
    }, [activities]);

    const moveItem = useCallback((id: string, to: number) => {
        const newArr = [...activities];
        const from = activities.findIndex(x => x.id === id);
        const [oldElt] = newArr.splice(from, 1);
        newArr.splice(to, 0, oldElt);
        setActivities(newArr);
        markDirty();
    }, [activities]);

    const getRealActivityId = useCallback(async (id: string) => {
        if (id.startsWith('%local')) {
            const newData = await save();
            if (newData) {
                const index = activities.findIndex(x => x.id === id);
                return newData.attributes.activities[index].id;
            }
            throw new Error('Failed to obtain ID');
        }
        else {
            return id;
        }
    }, [save, activities]);

    function setActivityConfig(index: number, activityConfig: any) {
        const newActivities = [
            ...activities.slice(0, index),
            {
                ...activities[index],
                configuration: activityConfig
            },
            ...activities.slice(index + 1)
        ];
        setActivities(newActivities);
        markDirty();
    }

    const [selectActivityDialog, openSelectActivityDialog] = useImperativeDialog(SelectActivityDialog, {
        onSelectActivity: addActivity
    });

    if (isLoading) {
        return <SkeletonActivityListPane sx={sx} />;
    }

    function makeWidget(activityEntity: LocalActivityReference, index: number) {
        if (activityEntity.isReference) {
            return <ActivityDragDropBox
                key={activityEntity.id}
                id={activityEntity.id}
                skeleton={true}
                classroomId={classroomId}
                findItem={findItem}
                moveItem={moveItem}
                getRealActivityId={getRealActivityId} />;
        }

        return <ActivityDragDropBox
            key={activityEntity.id}
            id={activityEntity.id}
            skeleton={false}
            activity={activityEntity.activityType}
            classroomId={classroomId}
            activityConfig={activityEntity.configuration}
            onActivityConfigChange={x => setActivityConfig(index, x)}
            findItem={findItem}
            moveItem={moveItem}
            getRealActivityId={getRealActivityId} />;
    }

    return <>
        {selectActivityDialog}
        <Card sx={sx}>
            <CardContent>
                <TextField placeholder="New Lesson"
                    variant="standard"
                    hiddenLabel
                    fullWidth
                    value={displayName}
                    onChange={e => {
                        if (e.target.value.length <= 100) {
                            modifyActivity({ displayName: e.target.value });
                            markDirty();
                        }
                    }}
                    InputProps={{ disableUnderline: true, sx: ({ typography, transitions }) => ({
                        ...typography.h6,
                        "&:hover:after": {
                            backgroundColor: ({palette}) => palette.action.hover,
                            borderRadius: 1
                        },
                        "&:after": {
                            content: "''",
                            position: "absolute",
                            width: ({ spacing }) => `calc(100% + ${spacing(2)})`,
                            height: "100%",
                            pointerEvents: "none",
                            mx: -1,
                            borderRadius: 1,
                            transition: transitions.create("background-color", {
                                duration: transitions.duration.shorter,
                                easing: transitions.easing.easeOut
                            })
                        }
                    }) }} />
                <Typography variant="body2" component="span">{toLuxon(date).toFormat("DDDD")}</Typography>
            </CardContent>
            <Divider />
            <Box sx={{ backgroundColor: ({palette}) => palette.background.default, p: 1 }}>
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Add Activity">
                        <IconButton onClick={openSelectActivityDialog}><Add/></IconButton>
                    </Tooltip>
                    <Tooltip title="Add Text/Code">
                        <IconButton onClick={() => addActivity(textInputActivityDescription)}><TextFields/></IconButton>
                    </Tooltip>
                    <Stack direction="row" justifyContent="end" spacing={1} flexGrow={1}>
                        <Tooltip title="Drag a widget here to delete it">
                            <div>
                                <Button ref={trashDrop}
                                    variant="contained"
                                    disabled={!isDragging}
                                    color="error" disableRipple
                                    startIcon={<Delete/>}>Delete</Button>
                            </div>
                        </Tooltip>
                    </Stack>
                </Stack>
            </Box>
            <Stack ref={drop} sx={{ p: 1, overflow: "auto" }} spacing={1}>
                {activities.map(makeWidget)}
            </Stack>
        </Card>
    </>;
}