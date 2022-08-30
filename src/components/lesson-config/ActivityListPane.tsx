import { Add, Delete, TextFields } from "@mui/icons-material";
import { Button, Card, CardContent, Divider, IconButton, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { Box, SxProps } from "@mui/system";
import { Dispatch, MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDrop } from "react-dnd";
import ActivityDescription from "../../activities/ActivityDescription";
import { useGetRequest } from "../../api/client/GetRequestHook";
import { ActivityEntity } from "../../api/entities/ActivityEntity";
import { LessonEntity } from "../../api/entities/LessonEntity";
import { Iso8601Date, toLuxon } from "../../util/iso8601";
import { ActivityDragDropBox, activityDragDropType } from "./ActivityDragDropBox";
import SkeletonActivityListPane from "./SkeletonActivityListPane";
import textInputActivityDescription from "../../activities/text-input/textInputDescription";
import useImperativeDialog from "../../hooks/ImperativeDialogHook";
import SelectActivityDialog from "./SelectActivityDialog";
import useNecodeFetch from '../../hooks/useNecodeFetch';
import { EntityReference } from '../../api/entities/EntityReference';

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
}: ActivityListPaneProps) {
    const onLessonChangeRef = useRef(onLessonChange);

    const { upload } = useNecodeFetch();
    
    const [, drop] = useDrop(() => ({ accept: activityDragDropType }));

    const [{ isDragging }, trashDrop] = useDrop(() => ({
        accept: activityDragDropType,
        collect(monitor) {
            return {
                isDragging: Boolean(monitor.getItemType() === activityDragDropType)
            };
        },
        drop(item: ActivityEntity) {
            const updatedObject = {
                ...lessonEntity!,
                attributes: {
                    ...lessonEntity!.attributes,
                    activities: activities.filter(x => x.id === item.id)
                }
            };

            mutateLesson(
                async () => {
                    await upload(`/api/classroom/${classroomId}/activity/${item.id}`, { method: 'DELETE' });
                    return updatedObject;
                },
                { optimisticData: updatedObject, rollbackOnError: true }
            );
        }
    }));

    async function addActivity(activity: ActivityDescription<any>) {
        const lesson = lessonEntity ?? await upload<LessonEntity<{ activities: 'deep' }>>(`/api/classroom/${classroomId}/lesson`, {
            method: 'POST',
            body: JSON.stringify({
                date,
                displayName: displayName,
            })
        });

        const activityEntity = await upload<ActivityEntity>(`/api/classroom/${classroomId}/lesson/${lesson.id}/activity`, {
            method: 'POST',
            body: JSON.stringify({
                activityType: activity.id,
                configuration: activity.defaultConfig,
                displayName: activity.displayName,
            })
        });
        
        mutateLesson({
            ...lesson,
            attributes: {
                ...lesson.attributes,
                activities: (lesson.attributes.activities ?? []).concat(activityEntity),
            }
        });
    }

    const lessonEndpoint = `/api/classroom/${classroomId}/lesson/${date}?include=activities`;
    const { data: lessonEntity, error: lessonEntityError, isLoading, mutate: mutateLesson } = useGetRequest<LessonEntity<{ activities: 'deep', classroom: 'shallow' }>>(lessonEndpoint);

    const activities = useMemo(() => lessonEntity?.attributes.activities ?? [], [lessonEntity]);

    const [displayName, setDisplayName] = useState('');

    useEffect(() => {
        if (lessonEntity) {
            onLessonChangeRef.current?.(lessonEntity);
            setDisplayName(lessonEntity.attributes.displayName);
        }
        else if (lessonEntityError) {
            onLessonChangeRef.current?.(undefined);
            setDisplayName('');
        }
    }, [lessonEntity, lessonEntityError]);

    const [activityConfigDeltas, setActivityConfigDeltas] = useState({} as { [activityId: string]: any });

    const findItem = useCallback((id: string) => {
        return { index: activities.findIndex(x => x.id === id) };
    }, [activities]);

    const moveItem = useCallback(async (id: string, to: number) => {
        const newActivities = [...activities];
        const from = activities.findIndex(x => x.id === id);
        const [oldElt] = newActivities.splice(from, 1);
        newActivities.splice(to, 0, oldElt);

        // const updatedObject = {
        //     ...lessonEntity!,
        //     attributes: {
        //         ...lessonEntity!.attributes,
        //         activities: newActivities
        //     }
        // };

        // mutateLesson(
        //     async () => {
        //         await upload(`/api/classroom/${classroomId}/activity/${id}`, {
        //             method: 'PATCH',
        //             body: JSON.stringify({
        //                 order: to
        //             })
        //         });
        //         return updatedObject;
        //     },
        //     { optimisticData: updatedObject, rollbackOnError: true }
        // );
    }, [upload, classroomId, mutateLesson, lessonEntity, activities]);

    function setActivityConfig(index: number, activityConfig: any) {
        const updatedObject = {
            ...lessonEntity!,
            attributes: {
                ...lessonEntity!.attributes,
                activities: [
                    ...activities.slice(0, index),
                    {
                        ...activities[index],
                        configuration: activityConfig
                    },
                    ...activities.slice(index + 1)
                ]
            }
        };

        mutateLesson(
            async () => {
                await upload(`/api/classroom/${classroomId}/activity/${activities[index].id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        configuration: activityConfig,
                    })
                });
                return updatedObject;
            },
            { optimisticData: updatedObject, rollbackOnError: true }
        );
    }

    const [selectActivityDialog, openSelectActivityDialog] = useImperativeDialog(SelectActivityDialog, {
        onSelectActivity: addActivity
    });

    if (isLoading && !lessonEntity) {
        return <SkeletonActivityListPane sx={sx} />;
    }

    function makeWidget(activityEntity: ActivityEntity, index: number) {
        return <ActivityDragDropBox
            key={activityEntity.id}
            id={activityEntity.id}
            skeleton={false}
            classroomId={classroomId}
            activityTypeId={activityEntity.attributes.activityType}
            activityConfig={activityEntity.attributes.configuration}
            onActivityConfigChange={x => {
                setActivityConfig(index, x);
                setActivityConfigDeltas({ ...activityConfigDeltas, [activityEntity.id]: x });
            }}
            findItem={findItem}
            moveItem={moveItem} />;
    }

    return <>
        {selectActivityDialog}
        <Card variant="outlined" sx={sx}>
            <CardContent>
                <TextField placeholder="New Lesson"
                    variant="standard"
                    hiddenLabel
                    fullWidth
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
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
            <Box sx={{ m: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Tooltip title="Add Activity" disableInteractive>
                        <IconButton onClick={openSelectActivityDialog}><Add/></IconButton>
                    </Tooltip>
                    <Tooltip title="Add Text/Code" disableInteractive>
                        <IconButton onClick={() => addActivity(textInputActivityDescription)}><TextFields/></IconButton>
                    </Tooltip>
                    <Stack direction="row" justifyContent="end" spacing={1} flexGrow={1}>
                        <Tooltip title="Drag a widget here to delete it" disableInteractive>
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
            <Stack ref={drop} sx={{ m: 1, mt: 0, overflow: "auto" }} spacing={1}>
                {activities.map(makeWidget)}
            </Stack>
        </Card>
    </>;
}