import { ArrowBack, Close, Save } from '@mui/icons-material';
import { Button, Stack, Toolbar } from '@mui/material';
import { PropsWithChildren } from 'react';

interface InstructorToolbarProps extends PropsWithChildren {
    onReturnToManage?(): void;
    onEndActivity?(): void;
    onSave?(): void;
    canSave?: boolean;
}

export default function InstructorToolbar({ onReturnToManage, onEndActivity, onSave, canSave, children }: InstructorToolbarProps) {
    return <Toolbar variant="dense" sx={{
        minHeight: "36px",
        px: "16px !important",
        display: "flex",
        flexDirection: "row",
        "& > * + *": {
            ml: 1
        }
    }}>
        {onReturnToManage
            ? <Button size="small" startIcon={<ArrowBack/>}
                onClick={onReturnToManage}>
                Return to Manage Classroom
            </Button>
            : undefined}
        {onSave
            ? <Button size="small" startIcon={<Save/>} onClick={onSave} disabled={!canSave}>Save Changes</Button>
            : undefined}
        {onEndActivity
            ? <Button size="small" color="error" startIcon={<Close/>} onClick={onEndActivity}>
                End Activity
            </Button>
            : undefined}
        <Stack direction="row" justifyContent="flex-end" flexGrow={1} spacing={1}>
            {children
                ? <Stack direction="row" spacing={1}>{children}</Stack>
                : undefined}
        </Stack>
    </Toolbar>;
}