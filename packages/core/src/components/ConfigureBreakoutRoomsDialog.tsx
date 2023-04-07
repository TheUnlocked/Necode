import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Tooltip } from '@mui/material';
import { Editor, useLocalCachedState } from '@necode-org/activity-dev';
import { useMemo } from 'react';

export interface ConfigureBreakoutRoomsDialogProps {
    open: boolean;
    onClose(): void;
    rooms: string[]
    onRoomsChange(rooms: string[]): void;
}

function getRoomsFromString(str: string) {
    return str.trim().split('\n').map(x => x.trim());
}

export default function ConfigureBreakoutRoomsDialog({ open, onClose, rooms, onRoomsChange }: ConfigureBreakoutRoomsDialogProps) {
    const [value, setValue, commit, revert, isDirty] = useLocalCachedState(
        useMemo(() => rooms.join('\n'), [rooms]),
        str => onRoomsChange(getRoomsFromString(str))
    );

    function saveAndClose() {
        commit();
        onClose();
    }

    function cancel() {
        revert();
        onClose();
    }

    const canSave = useMemo(() => {
        const numRooms = getRoomsFromString(value).length;
        return numRooms >= 2 && numRooms <= 50;
    }, [value]);

    return <Dialog open={open} onClose={isDirty ? undefined : onClose}>
        <DialogTitle>Configure Breakout Room Names</DialogTitle>
        <DialogContent sx={{ px: 0 }}>
            <Editor value={value} onChange={v => setValue(v ?? '')} height={400} />
        </DialogContent>
        <DialogActions>
            <Button onClick={cancel}>Cancel</Button>
            <Tooltip title={canSave ? undefined : "An activity can only have between 2 and 50 breakout rooms."}>
                <Box>
                    <Button disabled={!isDirty || !canSave} onClick={saveAndClose}>Save</Button>
                </Box>
            </Tooltip>
        </DialogActions>
    </Dialog>;
}