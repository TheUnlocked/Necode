import { Button, Card, Stack, Typography } from "@mui/material";
import { ActivityConfigWidgetProps } from "../../activities/ActivityDescription";
import DragHandle, { dragHandleSelector } from "./DragHandle";

export default function DefaultActivityWidget({
    goToConfigPage,
    dragHandle,
    activity
}: ActivityConfigWidgetProps) {
    return <Card elevation={2} sx={{ p: 1, [`&:hover ${dragHandleSelector}`]: {
        visibility: "visible"
    } }}>
        <Stack direction="row" spacing={1} alignItems="center">
            <DragHandle innerRef={dragHandle}/>
            <Typography variant="h6" flexGrow={1}>{activity.displayName}</Typography>
            {goToConfigPage ? <Button variant="outlined" onClick={goToConfigPage}>Configure</Button> : undefined}
            <Button variant="contained">Start Activity</Button>
        </Stack>
    </Card>;
}