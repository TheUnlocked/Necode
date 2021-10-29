import { Button, Card, Stack, Typography } from "@mui/material";
import { ConnectDragSource } from "react-dnd";
import DragHandle from "./DragHandle";

export default function GoActivityInput(props: {
    dragHandle: ConnectDragSource
}) {
    return <Card elevation={3} sx={{ p: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
            <DragHandle innerRef={props.dragHandle}/>
            <Typography variant="h6" flexGrow={1}>Activity Name Here</Typography>
            <Button variant="contained">Start Activity</Button>
        </Stack>
    </Card>
}