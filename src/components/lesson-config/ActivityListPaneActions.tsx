import { Add, ContentCopy, Delete, TextFields } from '@mui/icons-material';
import { Button, IconButton, Tooltip } from '@mui/material';
import { Stack } from '@mui/system';
import { useDrop } from 'react-dnd';
import ActivityDescription from '../../activities/ActivityDescription';
import textInputActivityDescription from '../../activities/text-input/textInputDescription';
import { ActivityEntity } from '../../api/entities/ActivityEntity';
import { EntityType } from '../../api/entities/Entity';
import { LessonEntity } from '../../api/entities/LessonEntity';
import { activityDragDropType, lessonDragDropType } from '../../dnd/types';
import useImperativeDialog from '../../hooks/ImperativeDialogHook';
import SelectActivityDialog from './SelectActivityDialog';

interface ActivityListPaneActionsProps {
    onDeleteActivity?(item: ActivityEntity): void;
    onDeleteLesson?(item: LessonEntity): void;
    onClone?(item: ActivityEntity): void;
    onCreate?(item: ActivityDescription<any>): void;
}

const dragTypes = [activityDragDropType, lessonDragDropType];

export default function ActivityListPaneActions({ onCreate, onClone, onDeleteActivity, onDeleteLesson }: ActivityListPaneActionsProps) {
    const [{ isDragging: isDraggingActivity }, cloneDrop] = useDrop(() => ({
        accept: dragTypes,
        collect: monitor => ({ isDragging: monitor.getItemType() === activityDragDropType }),
        drop(item: ActivityEntity | LessonEntity) {
            if (item.type === EntityType.Activity) {
                onClone?.(item);
            }
        }
    }), [onClone]);
    
    const [{ isDragging: isDraggingActivityOrLesson }, trashDrop] = useDrop(() => ({
        accept: [activityDragDropType, lessonDragDropType],
        collect: monitor => ({ isDragging: dragTypes.includes(monitor.getItemType() as string) }),
        drop(item: ActivityEntity | LessonEntity) {
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