import { Card, Stack, TextField } from "@mui/material";
import { PropsWithChildren } from 'react';
import { ActivityConfigWidgetProps } from "../../../plugin-dev/src/activities/ActivityDescription";
import useLocalCachedState from '../hooks/useLocalCachedState';
import DragHandle, { dragHandleSelector } from "./DragHandle";

export default function ActivityWidgetBase({
    dragHandle,
    displayName: _displayName,
    onDisplayNameChange,
    children,
}: PropsWithChildren<ActivityConfigWidgetProps<any>>) {
    const [displayName, setDisplayName, commitDisplayName] = useLocalCachedState(_displayName, onDisplayNameChange);

    return <Card sx={{ p: 1, [`&:hover ${dragHandleSelector}`]: {
        visibility: "visible"
    } }}>
        <Stack direction="row" gap={1} alignItems="center">
            <DragHandle innerRef={dragHandle}/>
            <TextField size="small" variant="filled" hiddenLabel
                value={displayName} onChange={e => setDisplayName(e.target.value)}
                onBlur={commitDisplayName}
                sx={{ flexGrow: 1 }}
                InputProps={{
                    disableUnderline: true,
                    sx: ({ typography, transitions, spacing }) => ({
                        backgroundColor: "transparent !important",
                        ...typography.h6,
                        "& > input": {
                            padding: 0,
                        },
                        "&:hover:after": {
                            backgroundColor: ({ palette }) => palette.action.hover,
                            borderRadius: 1
                        },
                        "&:after": {
                            content: "''",
                            position: "absolute",
                            width: `calc(100% + ${spacing(1)})`,
                            height: "100%",
                            pointerEvents: "none",
                            mx: -1,
                            borderRadius: 1,
                            transition: transitions.create("background-color", {
                                duration: transitions.duration.shorter,
                                easing: transitions.easing.easeOut
                            })
                        }
                    }),
                }} />
            {children}
        </Stack>
    </Card>;
}