import { Card, Skeleton, Stack, Typography } from "@mui/material";
import DragHandle from "~shared-ui/components/DragHandle";

export default function SkeletonWidget() {
    return <Card sx={{ p: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
            <DragHandle />
            <Typography variant="h6" flexGrow={1}>
                <Skeleton variant="text" sx={{ width: "max(300px, 40%)" }} />
            </Typography>
        </Stack>
    </Card>;
}