import { Add, ContentCopy, Delete, TextFields } from '@mui/icons-material';
import { Button, IconButton, Tooltip, Stack } from '@mui/material';
import { useDrop } from 'use-dnd';
import ActivityDescription from '../../activities/ActivityDescription';
import textInputActivityDescription from '../../activities/text-input/textInputDescription';
import { ActivityEntity } from 'api/entities/ActivityEntity';
import { EntityType } from 'api/entities/Entity';
import { LessonEntity } from 'api/entities/LessonEntity';
import { activityDragDropType, lessonDragDropType } from '../../dnd/types';
import useImperativeDialog from '../../hooks/useImperativeDialog';
import SelectActivityDialog from './SelectActivityDialog';

interface ActivityListPaneActionsProps {
    onDeleteActivity?(item: ActivityEntity): void;
    onDeleteLesson?(item: LessonEntity): void;
    onClone?(item: ActivityEntity): void;
    onCreate?(item: ActivityDescription<any>): void;
}

export default function ActivityListPaneActions({ onCreate, onClone, onDeleteActivity, onDeleteLesson }: ActivityListPaneActionsProps) {
    const [{ isDragging: isDraggingActivity }, cloneDrop] = useDrop(() => ({
        accept: activityDragDropType,
        acceptForeign: true, // Cloning foreign objects is fine because references don't matter.
        collect: ({ itemType }) => ({ isDragging: Boolean(itemType) }),
        hover({ event }) {
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'copy';
            }
        },
        drop({ item }) {
            onClone?.(item);
        }
    }), [onClone]);
    
    const [{ isDragging: isDraggingActivityOrLesson }, trashDrop] = useDrop(() => ({
        accept: [activityDragDropType, lessonDragDropType] as const,
        acceptForeign: false,
        collect: ({ itemType }) => ({ isDragging: Boolean(itemType) }),
        drop({ item }) {
            if (item.type === EntityType.Activity) {
                onDeleteActivity?.(item);
            }
            else if (item.type === EntityType.Lesson) {
                onDeleteLesson?.(item);
            }
        },
    }), [onDeleteActivity, onDeleteLesson]);

    const [selectActivityDialog, openSelectActivityDialog] = useImperativeDialog(
        SelectActivityDialog,
        { onSelectActivity: onCreate },
    );

    return <>
        {selectActivityDialog}
        <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip title="Add Activity" disableInteractive>
                <IconButton onClick={() => openSelectActivityDialog()}><Add/></IconButton>
            </Tooltip>
            <Tooltip title="Add Text/Code" disableInteractive>
                <IconButton onClick={() => onCreate?.(textInputActivityDescription)}><TextFields/></IconButton>
            </Tooltip>
            <Stack direction="row" justifyContent="end" spacing={1} flexGrow={1}>
                <Tooltip title="Drag an activity here to clone it" disableInteractive>
                    <div>
                        <Button ref={cloneDrop}
                            variant="outlined"
                            disabled={!isDraggingActivity}
                            color="success" disableRipple
                            startIcon={<ContentCopy/>}>Clone</Button>
                    </div>
                </Tooltip>
                <Tooltip title="Drag an activity here to delete it" disableInteractive>
                    <div>
                        <Button ref={trashDrop}
                            variant="outlined"
                            disabled={!isDraggingActivityOrLesson}
                            color="error" disableRipple
                            startIcon={<Delete/>}>Delete</Button>
                    </div>
                </Tooltip>
            </Stack>
        </Stack>
    </>;
}