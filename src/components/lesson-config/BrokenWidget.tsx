import { Error } from '@mui/icons-material';
import { Tooltip } from '@mui/material';
import { ActivityConfigWidgetProps } from "../../activities/ActivityDescription";
import ActivityWidgetBase from './ActivityWidgetBase';

export default function BrokenWidget(props: ActivityConfigWidgetProps) {
    return <ActivityWidgetBase {...props}>
        <Tooltip title={`This activity has type '${props.activityTypeId}' which is no longer recognized by Necode. Please contact an administrator.`}>
            <Error color="error" />
        </Tooltip>
    </ActivityWidgetBase>;
}