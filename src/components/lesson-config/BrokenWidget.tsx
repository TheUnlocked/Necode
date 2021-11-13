import { Card, Stack, Typography } from "@mui/material";
import { ActivityConfigWidgetProps } from "../../activities/ActivityDescription";
import DragHandle, { dragHandleSelector } from "./DragHandle";

export default function BrokenWidget({ dragHandle }: ActivityConfigWidgetProps) {
    return <Card variant="outlined" sx={{ p: 1, [`&:hover ${dragHandleSelector}`]: {
        visibility: 'visible'
    } }}>
        <Stack direction="row" spacing={1} alignItems="center">
            <DragHandle innerRef={dragHandle} />
            <Typography variant="h6" flexGrow={1}>Unknown Activity</Typography>
        </Stack>
    </Card>;
}