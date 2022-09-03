import { Card, CardContent, Divider, Stack, TextField, Typography } from "@mui/material";
import { Box, SxProps } from "@mui/system";
import { Dispatch, MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDrop } from "react-dnd";
import composeRefs from '@seznam/compose-react-refs'
import ActivityDescription from "../../activities/ActivityDescription";
import { useGetRequest } from "../../api/client/GetRequestHook";
import { ActivityEntity } from "../../api/entities/ActivityEntity";
import { LessonEntity } from "../../api/entities/LessonEntity";
import { Iso8601Date, toLuxon } from "../../util/iso8601";
import { ActivityDragDropBox, activityDragDropType } from "./ActivityDragDropBox";
import SkeletonActivityListPane from "./SkeletonActivityListPane";
import useNecodeFetch from '../../hooks/useNecodeFetch';
import WidgetDragLayer from './WidgetDragLayer';
import { binarySearchIndex } from '../../util/binarySearch';
import ActivityListPaneActions from './ActivityListPaneActions';
import useLocalCachedState from '../../hooks/useLocalCachedState';
import { assignRef, SimpleRef } from '../../util/simpleRef';

interface ActivityListPaneProps {
    sx: SxProps;
    date: Iso8601Date;
    classroomId: string;
    skeletonActivityCount?: number;
    onLessonChange?: Dispatch<LessonEntity<{ activities: 'shallow' }> | undefined>;
    refreshRef?: SimpleRef<(() => void) | undefined>;
}

function findWidgetInsertPosition(parent: HTMLElement, mouseY: number, guess?: number): number {
    const children = [...parent.children];

    let lastRect!: DOMRect;
    const index = binarySearchIndex(children, child => {
        lastRect = child.getBoundingClientRect();
        const { top, bottom } = lastRect;

        // include margins in the child.
        if (mouseY < top - 8) {
            return -1;
        }
        else if (mouseY > bottom + 8) {
            return 1;
        }
        return 0;
    }, { guess });

    if (index === undefined) {
        // The only way for it to not have been found is if the cursor is in the empty space below an activity.
        return children.length;
    }
    
    if (mouseY > lastRect.top + lastRect.height / 2) {
        return index + 0.5;
    }
    return index;
}

export default function ActivityListPane({
    sx,
    classroomId,
    skeletonActivityCount,
    date,
    onLessonChange,
    refreshRef,
}: ActivityListPaneProps) {
    const lessonEndpoint = `/api/classroom/${classroomId}/lesson/${date}?include=activities`;
    const { data: lessonEntity, isLoading, mutate: mutateLesson } = useGetRequest<LessonEntity<{ activities: 'deep', classroom: 'shallow' }>>(lessonEndpoint);

    assignRef(refreshRef, mutateLesson);

    const activities = useMemo(() => lessonEntity?.attributes.activities ?? [], [lessonEntity]);

    const { upload } = useNecodeFetch();
    
    const widgetContainerRef = useRef<HTMLElement>();

    const [, setLastHoveredWidgetIndex] = useState<number>();
    const [dropIntoPos, setDropIntoPos] = useState<number>();

    const dropIndicatorPos = useMemo(() => {
        const container = widgetContainerRef.current;
        if (container && dropIntoPos !== undefined) {
            if (dropIntoPos >= container.children.length) {
                // Place indicator after last widget
                const rect = container.children[container.children.length - 1].getBoundingClientRect();
                return {
                    left: rect.left,
                    width: rect.width,
                    // +4 for the margin
                    y: rect.bottom + 4,
                };
            }
            else {
                const rect = container.children[dropIntoPos].getBoundingClientRect();
                return {
                    left: rect.left,
                    width: rect.width,
                    // -4 for the margin
                    y: rect.top - 4,
                };
            }
        }
    }, [dropIntoPos]);

    const [{ isDragging }, drop] = useDrop(() => ({
        accept: activityDragDropType,
        collect(monitor) {
            return { isDragging: monitor.getItemType() === activityDragDropType };
        },
        hover(item: ActivityEntity, monitor) {
            const container = widgetContainerRef.current;
            if (container) {
                setLastHoveredWidgetIndex(oldWidgetIndex => {
                    if (!monitor.isOver()) {
                        return oldWidgetIndex;
                    }
                    const fracDropPos = findWidgetInsertPosition(container, monitor.getClientOffset()!.y, oldWidgetIndex);
    
                    const intDropPos = Math.ceil(fracDropPos);
                    if (activities[intDropPos]?.id === item.id) {
                        // The target is the dragged widget's slot
                        if (intDropPos === activities.length - 1) {
                            // The widget being dragged is the last widget
                            setDropIntoPos(intDropPos);
                        }
                        else if (fracDropPos % 1 !== 0) { 
                            // Hovering over the widget before the target
                            setDropIntoPos(intDropPos - 1);
                        }
                        else {
                            // Hovering over the target
                            setDropIntoPos(intDropPos + 1);
                        }
                    }
                    else {
                        setDropIntoPos(intDropPos);
                    }

                    return Math.floor(fracDropPos);
                });
            }
        },
        drop({ id }, monitor) {
            if (!monitor.isOver() || dropIntoPos === undefined) {
                return;
            }
            const newActivities = [...activities];
            const from = activities.findIndex(x => x.id === id);
            const [oldElt] = newActivities.splice(from, 1);
            if (dropIntoPos > from) {
                newActivities.splice(dropIntoPos - 1, 0, oldElt);
            }
            else {
                newActivities.splice(dropIntoPos, 0, oldElt);
            }

            const updatedObject = {
                ...lessonEntity!,
                attributes: {
                    ...lessonEntity!.attributes,
                    activities: newActivities
                }
            };

            mutateLesson(
                async () => {
                    await upload(`/api/classroom/${classroomId}/activity/${id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({
                            order: dropIntoPos
                        })
                    });
                    return updatedObject;
                },
                { optimisticData: updatedObject, rollbackOnError: true }
            );
            // No need to fire onLessonChange for reordering
        },
    }), [activities, dropIntoPos, lessonEntity, classroomId, mutateLesson, upload]);

    useEffect(() => {
        if (!isDragging) {
            setDropIntoPos(undefined);
        }
    }, [isDragging]);

    const [displayName, setDisplayName, commitDisplayName, revertDisplayName] = useLocalCachedState(lessonEntity?.attributes.displayName ?? '', useCallback(async displayName => {
        if (!lessonEntity) {
            mutateLesson(async () => {
                const lesson = await upload<LessonEntity<{ activities: 'deep' }>>(`/api/classroom/${classroomId}/lesson`, {
                    method: 'POST',
                    body: JSON.stringify({
                        date,
                        displayName,
                    })
                });
                onLessonChange?.(lesson);
                return lesson;
            });
            return;
        }

        const updatedObject = {
            ...lessonEntity!,
            attributes: {
                ...lessonEntity!.attributes,
                displayName
            }
        };

        mutateLesson(
            async () => {
                await upload(`/api/classroom/${classroomId}/lesson/${lessonEntity.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ displayName }),
                });
                onLessonChange?.(updatedObject);
                return updatedObject;
            },
            { optimisticData: updatedObject, rollbackOnError: true }
        );
    }, [classroomId, date, lessonEntity, upload, onLessonChange, mutateLesson]));

    const createActivityHandler = useCallback(async (activity: ActivityDescription<any>) => {
        const lesson = lessonEntity ?? await upload<LessonEntity<{ activities: 'deep' }>>(`/api/classroom/${classroomId}/lesson`, {
            method: 'POST',
            body: JSON.stringify({
                date,
                displayName,
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

        const updatedObject = {
            ...lesson,
            attributes: {
                ...lesson.attributes,
                activities: (lesson.attributes.activities ?? []).concat(activityEntity),
            }
        };
        
        mutateLesson(updatedObject);
        onLessonChange?.(updatedObject);
    }, [classroomId, date, displayName, lessonEntity, upload, mutateLesson, onLessonChange]);

    const deleteActivityHandler = useCallback((activity: ActivityEntity) => {
        const updatedObject = {
            ...lessonEntity!,
            attributes: {
                ...lessonEntity!.attributes,
                activities: activities.filter(x => x.id !== activity.id)
            }
        };

        mutateLesson(
            async () => {
                await upload(`/api/classroom/${classroomId}/activity/${activity.id}`, { method: 'DELETE' });
                onLessonChange?.(updatedObject);
                return updatedObject;
            },
            { optimisticData: updatedObject, rollbackOnError: true }
        );
        
    }, [classroomId, lessonEntity, activities, upload, mutateLesson, onLessonChange]);

    const activityConfigChangeHandler = useCallback((activity: ActivityEntity, newConfig: any) => {
        const updatedObject = {
            ...lessonEntity!,
            attributes: {
                ...lessonEntity!.attributes,
                activities: activities.map(a => a === activity ? { ...a, configuration: newConfig } : a)
            }
        };

        mutateLesson(
            async () => {
                await upload(`/api/classroom/${classroomId}/activity/${activity.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        configuration: newConfig,
                    })
                });
                onLessonChange?.(updatedObject);
                return updatedObject;
            },
            { optimisticData: updatedObject, rollbackOnError: true }
        );
    }, [classroomId, lessonEntity, activities, upload, mutateLesson, onLessonChange]);

    const activityWidgets = useMemo(() =>
        activities.map(activity => <ActivityDragDropBox
            key={activity.id}
            id={activity.id}
            skeleton={false}
            classroomId={classroomId}
            activity={activity}
            onActivityConfigChange={x => activityConfigChangeHandler(activity, x)} />),
        [classroomId, activities, activityConfigChangeHandler]
    );

    if (isLoading && !lessonEntity) {
        return <SkeletonActivityListPane sx={sx} activityCount={skeletonActivityCount} />;
    }

    return <>
        <WidgetDragLayer dropIndicatorPos={dropIndicatorPos} />
        <Card variant="outlined" sx={sx}>
            <CardContent>
                <TextField placeholder="New Lesson"
                    variant="standard"
                    hiddenLabel
                    fullWidth
                    value={displayName}
                    onBlur={commitDisplayName}
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
                <ActivityListPaneActions onCreate={createActivityHandler} onDelete={deleteActivityHandler} />
            </Box>
            <Stack ref={composeRefs(drop, widgetContainerRef)} sx={{ m: 1, mt: 0, flexGrow: 1, overflow: "auto" }} spacing={1}>
                {activityWidgets}
            </Stack>
        </Card>
    </>;
}