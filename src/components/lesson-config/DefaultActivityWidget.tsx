import { Info } from '@mui/icons-material';
import { Box, Button, Tooltip } from "@mui/material";
import { PropsWithChildren } from 'react';
import { ActivityConfigWidgetProps } from "../../activities/ActivityDescription";
import ActivityWidgetBase from './ActivityWidgetBase';

const infoIconClass = 'ActivityInfo-svg-icon';
const infoIconSelector = `.${infoIconClass}`;

export default function DefaultActivityWidget(props: PropsWithChildren<ActivityConfigWidgetProps<any>>) {
    return <Box sx={{ [`&:hover ${infoIconSelector}`]: { visibility: "visible" } }}>
        <ActivityWidgetBase {...props}>
            {props.children}
            <Tooltip title={props.activityTypeId} className={infoIconClass}>
                <Info sx={{ visibility: "hidden", color: ({ palette }) => palette.text.disabled }} />
            </Tooltip>
            {props.goToConfigPage ? <Button variant="outlined" onClick={props.goToConfigPage}>Configure</Button> : undefined}
            <Button variant="contained" onClick={props.startActivity}>Start Activity</Button>
        </ActivityWidgetBase>
    </Box>;
}