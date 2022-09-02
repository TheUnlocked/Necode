import { Card, CardContent, Divider, Skeleton, Stack, Typography } from "@mui/material";
import { Box, SxProps } from "@mui/system";
import { ActivityDragDropBox } from "./ActivityDragDropBox";

interface SkeletonActivityListPaneProps {
    sx: SxProps;
    activityCount?: number;
}

export default function SkeletonActivityListPane({
    sx,
    activityCount,
}: SkeletonActivityListPaneProps) {
    return <Card variant="outlined" sx={sx}>
        <CardContent>
            <Typography variant="h6" component="span"><Skeleton variant="text" sx={{ py: `${9.75 / 2}px` }} /></Typography>
            <Typography variant="body2" component="span"><Skeleton variant="text" width="150px" /></Typography>
        </CardContent>
        <Divider />
        <Box sx={{ backgroundColor: ({palette}) => palette.background.default, p: 1 }}>
            <Stack direction="row">
                <Skeleton variant="circular" width={32} height={32} sx={{ m: 0.5, mr: 1.5 }} />
                <Skeleton variant="circular" width={32} height={32} sx={{ m: 0.5, mr: 1.5 }} />
            </Stack>
        </Box>
        <Stack sx={{ p: 1, overflow: "auto", flexGrow: 1 }} spacing={1}>
            {new Array(activityCount ?? 0).fill(undefined)
                .map((_, i) =>
                    <ActivityDragDropBox key={i}
                        id={`${i}`}
                        skeleton={true}
                        classroomId={''} />)}
        </Stack>
    </Card>;
}