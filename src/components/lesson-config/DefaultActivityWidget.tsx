import { Error } from '@mui/icons-material';
import { Button, Card, Stack, TextField, Typography } from "@mui/material";
import { ActivityConfigWidgetProps } from "../../activities/ActivityDescription";
import useLocalCachedState from '../../hooks/useLocalCachedState';
import DragHandle, { dragHandleSelector } from "../widgets/DragHandle";

export default function DefaultActivityWidget({
    startActivity,
    goToConfigPage,
    dragHandle,
    displayName: _displayName,
    onDisplayNameChange,
    activityTypeId,
}: ActivityConfigWidgetProps) {
    const [displayName, setDisplayName, commitDisplayName] = useLocalCachedState(_displayName, onDisplayNameChange);

    return <Card sx={{ p: 1, [`&:hover ${dragHandleSelector}`]: {
        visibility: "visible"
    } }}>
        <Stack direction="row" spacing={1} alignItems="center">
            <DragHandle innerRef={dragHandle}/>
            <Stack flexGrow={1} direction="column">
                <TextField
                    size="small"
                    variant="filled" hiddenLabel
                    value={displayName} onChange={e => setDisplayName(e.target.value)}
                    onBlur={commitDisplayName}
                    InputProps={{
                        disableUnderline: true,
                        sx: ({typography}) => ({
                            backgroundColor: "transparent !important",
                            ...typography.h6,
                            "& > input": {
                                padding: 0,
                            },
                        })
                    }} />
                <Typography variant="caption" color="text.secondary" flexGrow={1}>{activityTypeId}</Typography>
            </Stack>
            {goToConfigPage ? <Button variant="outlined" onClick={goToConfigPage}>Configure</Button> : undefined}
            <Button variant="contained" onClick={startActivity}>Start Activity</Button>
        </Stack>
    </Card>;
}