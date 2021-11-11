import { Button, Card, Stack, Typography } from "@mui/material";
import { ActivityConfigWidgetProps } from "../../activities/ActivityDescription";
import DragHandle from "./DragHandle";

export default function DefaultActivityWidget({
    id,
    classroom,
    activityConfig,
    onActivityConfigChange,
    dragHandle
}: ActivityConfigWidgetProps) {
    return <Card elevation={3} sx={{ p: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
            <DragHandle innerRef={dragHandle}/>
            <Typography variant="h6" flexGrow={1}>Activity Name Here</Typography>
            <Button variant="contained">Start Activity</Button>
        </Stack>
    </Card>;
}