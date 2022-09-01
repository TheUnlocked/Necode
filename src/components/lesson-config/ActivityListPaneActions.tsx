import { Add, Delete, Schedule, TextFields } from '@mui/icons-material';
import { Button, IconButton, Tooltip } from '@mui/material';
import { Stack } from '@mui/system';
import { useDrop } from 'react-dnd';
import ActivityDescription from '../../activities/ActivityDescription';
import textInputActivityDescription from '../../activities/text-input/textInputDescription';
import { ActivityEntity } from '../../api/entities/ActivityEntity';
import useImperativeDialog from '../../hooks/ImperativeDialogHook';
import { Iso8601Date } from '../../util/iso8601';
import { activityDragDropType } from './ActivityDragDropBox';
import SelectActivityDialog from './SelectActivityDialog';

interface ActivityListPaneActionsProps {
    onDelete?(item: ActivityEntity): void;
    onMove?(item: ActivityEntity, date: Iso8601Date): void;
    onCreate?(item: ActivityDescription<any>): void;
}

export default function ActivityListPaneActions({ onCreate, onMove, onDelete }: ActivityListPaneActionsProps) {
    const [isDragging, moveDrop] = useDrop(() => ({
        accept: activityDragDropType,
        collect: monitor => ({ isDragging: monitor.getItemType() === activityDragDropType }),
        drop(item: ActivityEntity) {
            // open move dialog
        }
    }), []);
    
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
                        <Button ref={moveDrop}
                            variant="outlined"
                            disabled={!isDragging}
                            color="primary" disableRipple
                            startIcon={<Schedule/>}>Move</Button>
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