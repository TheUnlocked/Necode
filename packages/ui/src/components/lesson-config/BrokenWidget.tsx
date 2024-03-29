import { Error } from '@mui/icons-material';
import { Tooltip } from '@mui/material';
import ActivityWidgetBase from '~shared-ui/components/ActivityWidgetBase';
import { ActivityConfigWidgetProps } from '@necode-org/plugin-dev';

export interface BrokenWidgetProps extends Omit<ActivityConfigWidgetProps, 'activityType'> {
    activityTypeId: string;
}

export default function BrokenWidget(props: BrokenWidgetProps) {
    return <ActivityWidgetBase {...props}>
        <Tooltip title={`This activity has type '${props.activityTypeId}' which is no longer recognized by Necode. Please contact an administrator.`}>
            <Error color="error" />
        </Tooltip>
    </ActivityWidgetBase>;
}