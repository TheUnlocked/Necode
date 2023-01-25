import { Card, Divider, Stack, Box, SxProps } from "@mui/material";
import { Dispatch, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDrop } from "use-dnd";
import composeRefs from '@seznam/compose-react-refs';
import ActivityDescription from "../../activities/ActivityDescription";
import { useGetRequest } from "../../hooks/useGetRequest";
import { ActivityEntity } from "~api/entities/ActivityEntity";
import { LessonEntity } from "~api/entities/LessonEntity";
import { Iso8601Date } from "~utils/iso8601";
import { ActivityDragDropBox } from "./ActivityDragDropBox";
import SkeletonActivityListPane from "./SkeletonActivityListPane";
import useNecodeFetch from '../../hooks/useNecodeFetch';
import WidgetDragLayer from './WidgetDragLayer';
import { binarySearchIndex } from '~utils/binarySearch';
import ActivityListPaneActions from './ActivityListPaneActions';
import { assignRef, SimpleRef } from '../../util/simpleRef';
import type { PartialAttributesOf } from '~backend/Endpoint';
import AcitivityListPaneTitleBar from './ActivityListPaneTitleBar';
import { activityDragDropType } from '../../dnd/types';
import { useConfirm } from 'material-ui-confirm';

interface ActivityListPaneProps {
    sx: SxProps;
    date: Iso8601Date;
    classroomId: string;
    forTodayOnly?: boolean;
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
    forTodayOnly,
    onLessonChange,
    refreshRef,
}: ActivityListPaneProps) {
    const lessonEndpoint = `/api/classroom/${classroomId}/lesson/${date}?include=activities`;
    const { data: lessonEntity, isLoading, mutate: mutateLesson, mutateDelete: deleteLesson }
        = useGetRequest<LessonEntity<{ activities: 'deep', classroom: 'shallow' }>>(lessonEndpoint);

    assignRef(refreshRef, mutateLesson);

    const activities: ActivityEntity[] = useMemo(() => lessonEntity?.attributes.activities ?? [], [lessonEntity]);

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
        acceptForeign: false, // TODO: Allow foreign activities
        collect({ itemType }) {
            return { isDragging: Boolean(itemType) };
        },
        hover({ event, item }) {
            const container = widgetContainerRef.current;
            if (container) {
                setLastHoveredWidgetIndex(oldWidgetIndex => {
                    if (activities.length === 1) {
                        setDropIntoPos(0);
                        return 0;
                    }
                    const fracDropPos = findWidgetInsertPosition(container, event.clientY, oldWidgetIndex);
    
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
        drop({ item: { id } }) {
            if (dropIntoPos === undefined) {
                return;
            }
            const newActivities = [...activities];
            const fromPos = activities.findIndex(x => x.id === id);
            const [oldElt] = newActivities.splice(fromPos, 1);
            if (dropIntoPos > fromPos) {
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
                            order: dropIntoPos > fromPos ? dropIntoPos - 1 : dropIntoPos
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

    const creatingLessonPromiseRef = useRef<Promise<LessonEntity<{ activities: 'deep' }>> | undefined>();
    const getOrCreateLesson = useCallback(async ({ date, displayName }: { date: Iso8601Date, displayName: string }) => {
        if (lessonEntity) {
            return lessonEntity;
        }

        if (creatingLessonPromiseRef.current) {
            return creatingLessonPromiseRef.current;
        }

        creatingLessonPromiseRef.current = upload(`/api/classroom/${classroomId}/lesson`, {
            method: 'POST',
            body: JSON.stringify({
                date,
                displayName,
            })
        });
        
        const result = await creatingLessonPromiseRef.current;

        mutateLesson(result);
        onLessonChange?.(result);

        return result;
    }, [classroomId, lessonEntity, upload, mutateLesson, onLessonChange]);

    useEffect(() => {
        if (lessonEntity) {
            creatingLessonPromiseRef.current = undefined;
        }
    }, [lessonEntity]);

    const displayName = lessonEntity?.attributes.displayName ?? '';

    const handleDisplayNameChange = useCallback(async (displayName: string) => {
        if (!lessonEntity) {
            getOrCreateLesson({ date, displayName });
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
    }, [classroomId, date, lessonEntity, getOrCreateLesson, upload, onLessonChange, mutateLesson]);

    const createActivityHandler = useCallback(async (activity: ActivityDescription<any>) => {
        const lesson = await getOrCreateLesson({ date, displayName });

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
    }, [classroomId, date, displayName, getOrCreateLesson, upload, mutateLesson, onLessonChange]);

    const cloneActivityHandler = useCallback(async (activity: ActivityEntity) => {
        if (!lessonEntity) {
            return;
        }

        const activityEntity = await upload<ActivityEntity>(`/api/classroom/${classroomId}/lesson/${lessonEntity.id}/activity`, {
            method: 'POST',
            body: JSON.stringify({
                activityType: activity.attributes.activityType,
                displayName: activity.attributes.displayName + ' (copy)',
                configuration: activity.attributes.configuration,
                enabledLanguages: activity.attributes.enabledLanguages,
            })
        });

        const updatedObject = {
            ...lessonEntity,
            attributes: {
                ...lessonEntity.attributes,
                activities: (lessonEntity.attributes.activities ?? []).concat(activityEntity),
            }
        };
        
        mutateLesson(updatedObject);
        onLessonChange?.(updatedObject);
    }, [classroomId, lessonEntity, upload, mutateLesson, onLessonChange]);

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

    const confirm = useConfirm();

    const deleteLessonHandler = useCallback(async (lesson: LessonEntity) => {
        try {
            await confirm({ description: `Are you sure you want to delete this lesson? This cannot be undone.` });
            deleteLesson(async () => {
                await upload(`/api/classroom/${classroomId}/lesson/${lesson.id}`, { method: 'DELETE' });
                onLessonChange?.(undefined);
            });
        }
        catch (e) { return }
    }, [classroomId, confirm, upload, deleteLesson, onLessonChange]);

    const activityChangeHandler = useCallback((activity: ActivityEntity, changes: Omit<PartialAttributesOf<ActivityEntity>, 'lesson'>) => {
        const updatedObject = {
            ...lessonEntity!,
            attributes: {
                ...lessonEntity!.attributes,
                activities: activities.map(a => a === activity ? {
                    ...a,
                    attributes: { ...a.attributes, ...changes }
                } : a)
            }
        };

        mutateLesson(
            async () => {
                await upload(`/api/classroom/${classroomId}/activity/${activity.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(changes),
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
            onActivityChange={x => activityChangeHandler(activity, x)} />),
        [classroomId, activities, activityChangeHandler]
    );

    if (isLoading && !lessonEntity) {
        return <SkeletonActivityListPane sx={sx} activityCount={skeletonActivityCount} />;
    }

    return <>
        <WidgetDragLayer dropIndicatorPos={dropIndicatorPos} />
        <Card variant="outlined" sx={sx}>
            <AcitivityListPaneTitleBar date={date} forTodayOnly={forTodayOnly ?? false} lesson={lessonEntity} onDisplayNameChange={handleDisplayNameChange} />
            <Divider />
            <Box sx={{ m: 1 }}>
                <ActivityListPaneActions
                    onCreate={createActivityHandler}
                    onClone={cloneActivityHandler}
                    onDeleteActivity={deleteActivityHandler}
                    onDeleteLesson={deleteLessonHandler} />
            </Box>
            <Stack ref={composeRefs(drop, widgetContainerRef)} sx={{ m: 1, mt: 0, flexGrow: 1, overflow: "auto" }} spacing={1}>
                {activityWidgets}
            </Stack>
        </Card>
    </>;
}