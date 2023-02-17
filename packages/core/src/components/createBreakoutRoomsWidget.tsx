import { Button } from '@mui/material';
import { DefaultActivityWidget, useImperativeDialog } from '@necode-org/activity-dev';
import { ActivityConfigWidgetProps } from '@necode-org/plugin-dev';
import { set } from 'lodash/fp';
import { ReactNode } from 'react';
import ConfigureBreakoutRoomsDialog from './ConfigureBreakoutRoomsDialog';

export default function createBreakoutRoomsWidget<F extends string>(roomsField: F, children?: ReactNode) {
    return function BreakoutRoomsWidget<Config extends { [K in F]: string[] }>(props: ActivityConfigWidgetProps<Config>) {
        const { activityConfig, onActivityConfigChange } = props;
    
        const [dialog, openDialog] = useImperativeDialog(ConfigureBreakoutRoomsDialog, {
            rooms: activityConfig[roomsField],
            onRoomsChange(rooms) {
                onActivityConfigChange(set(roomsField, rooms, activityConfig));
            },
        });
    
        return <DefaultActivityWidget {...props}>
            {children}
            {dialog}
            <Button onClick={() => openDialog()}>Edit Rooms</Button>
        </DefaultActivityWidget>;
    };    
}