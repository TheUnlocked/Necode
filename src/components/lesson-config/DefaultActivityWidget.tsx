import { Info } from '@mui/icons-material';
import { Box, Button, Tooltip } from "@mui/material";
import { ActivityConfigWidgetProps } from "../../activities/ActivityDescription";
import ActivityWidgetBase from './ActivityWidgetBase';

const infoIconClass = 'ActivityInfo-svg-icon'
const infoIconSelector = `.${infoIconClass}`

export default function DefaultActivityWidget(props: ActivityConfigWidgetProps) {
    return <Box sx={{ [`&:hover ${infoIconSelector}`]: { visibility: "visible" } }}>
        <ActivityWidgetBase {...props}>
            <Tooltip title={props.activityTypeId} className={infoIconClass}>
                <Info sx={{ visibility: "hidden", color: ({ palette }) => palette.text.disabled }} />
            </Tooltip>
            {props.goToConfigPage ? <Button variant="outlined" onClick={props.goToConfigPage}>Configure</Button> : undefined}
            <Button variant="contained" onClick={props.startActivity}>Start Activity</Button>
        </ActivityWidgetBase>
    </Box>;
}