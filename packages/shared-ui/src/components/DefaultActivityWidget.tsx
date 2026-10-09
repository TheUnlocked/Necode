import { Info } from '@mui/icons-material';
import { Box, Button, Tooltip } from "@mui/material";
import { ActivityConfigWidgetProps } from "@necode-org/plugin-dev";
import { PropsWithChildren } from 'react';
import ActivityWidgetBase from './ActivityWidgetBase';

const infoIconClass = 'ActivityInfo-svg-icon';
const infoIconSelector = `.${infoIconClass}`;

export default function DefaultActivityWidget(props: PropsWithChildren<ActivityConfigWidgetProps<any>>) {
    const { activityType, goToConfigPage, startActivity, children } = props;

    return <Box sx={{ [`&:hover ${infoIconSelector}`]: { visibility: "visible" } }}>
        <ActivityWidgetBase {...props}>
            <Tooltip title={activityType.id} className={infoIconClass}>
                <Info sx={{ visibility: "hidden", color: ({ palette }) => palette.text.disabled }} />
            </Tooltip>
            {children}
            {goToConfigPage
                ? <Button variant="outlined" onClick={goToConfigPage}>Configure</Button>
                : undefined}
            <Button variant="contained" onClick={startActivity}>Start Activity</Button>
        </ActivityWidgetBase>
    </Box>;
}