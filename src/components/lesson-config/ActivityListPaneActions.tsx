import { Add, ContentCopy, Delete, TextFields } from '@mui/icons-material';
import { Button, IconButton, Tooltip } from '@mui/material';
import { Stack } from '@mui/system';
import { useDrop } from 'react-dnd';
import ActivityDescription from '../../activities/ActivityDescription';
import textInputActivityDescription from '../../activities/text-input/textInputDescription';
import { ActivityEntity } from '../../api/entities/ActivityEntity';
import useImperativeDialog from '../../hooks/ImperativeDialogHook';
import { activityDragDropType } from './ActivityDragDropBox';
import SelectActivityDialog from './SelectActivityDialog';

interface ActivityListPaneActionsProps {
    onDelete?(item: ActivityEntity): void;
    onClone?(item: ActivityEntity): void;
    onCreate?(item: ActivityDescription<any>): void;
}

export default function ActivityListPaneActions({ onCreate, onClone, onDelete }: ActivityListPaneActionsProps) {
    const [isDragging, cloneDrop] = useDrop(() => ({
        accept: activityDragDropType,
        collect: monitor => ({ isDragging: monitor.getItemType() === activityDragDropType }),
        drop(item: ActivityEntity) {
            onClone?.(item);
        }
    }), [onClone]);
    
    const [, trashDrop] = useDrop(() => ({
        accept: activityDragDropType,
        drop: onDelete,
    }), [onDelete]);

    const [selectActivityDialog, openSelectActivityDialog] = useImperativeDialog(
        SelectActivityDialog,
        { onSelectActivity: onCreate },
    );

    return <>
        {selectActivityDialog}
        <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip title="Add Activity" disableInteractive>
                <IconButton onClick={openSelectActivityDialog}><Add/></IconButton>
            </Tooltip>
            <Tooltip title="Add Text/Code" disableInteractive>
                <IconButton onClick={() => onCreate?.(textInputActivityDescription)}><TextFields/></IconButton>
            </Tooltip>
            <Stack direction="row" justifyContent="end" spacing={1} flexGrow={1}>
                <Tooltip title="Drag an activity here to move it to another date" disableInteractive>
                    <div>
                        <Button ref={cloneDrop}
                            variant="outlined"
                            disabled={!isDragging}
                            color="success" disableRipple
                            startIcon={<ContentCopy/>}>Clone</Button>
                    </div>
                </Tooltip>
                <Tooltip title="Drag an activity here to delete it" disableInteractive>
                    <div>
                        <Button ref={trashDrop}
                            variant="outlined"
                            disabled={!isDragging}
                            color="error" disableRipple
                            startIcon={<Delete/>}>Delete</Button>
                    </div>
                </Tooltip>
            </Stack>
        </Stack>
    </>;
}