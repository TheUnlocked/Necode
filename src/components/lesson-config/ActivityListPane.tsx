import { Photo, TextFields } from "@mui/icons-material";
import { Card, CardContent, Divider, TextField, Typography } from "@mui/material";
import { SxProps } from "@mui/system";
import { DateTime } from "luxon";
import { useCallback, useState } from "react";
import { useDrop } from "react-dnd";
import { ActivityDragDropBox, ActivityDragDropData, activityDragDropType } from "./ActivityDragDropBox";
import GoActivityInput from "./GoActivityInput";
import LessonTextInput from "./LessonTextInput";

const activityTypes = [
    {
        type: "core/text",
        displayName: "Text/Code",
        icon: <TextFields/>,
        configPanel: LessonTextInput
    },
    {
        type: "canvas-ring",
        displayName: "Canvas Ring",
        icon: <Photo/>,
        configPanel: GoActivityInput
    },
] as const;

export default function ActivityListPane(props: {
    sx: SxProps,
    date: DateTime
}) {
    const [, drop] = useDrop(() => ({ accept: activityDragDropType }));

    const [activities, setActivities] = useState([
        { id: "a", type: activityTypes[0] },
        { id: "b", type: activityTypes[0] },
        { id: "c", type: activityTypes[1] },
    ] as (ActivityDragDropData & {type: (typeof activityTypes)[number]})[]);

    const findItem = useCallback((id: string) => {
        return { index: activities.findIndex(x => x.id === id) };
    }, [activities]);

    const moveItem = useCallback((id: string, to: number) => {
        const newArr = [...activities];
        const [oldElt] = newArr.splice(activities.findIndex(x => x.id === id), 1);
        newArr.splice(to, 0, oldElt);
        setActivities(newArr);
    }, [activities]);

    return <Card sx={props.sx}>
        <CardContent>
            <TextField placeholder="New Lesson"
                variant="standard"
                hiddenLabel
                fullWidth
                InputProps={{ disableUnderline: true, sx: {
                    fontFamily: ({ typography: { h6: { fontFamily } } }) => fontFamily,
                    fontSize: ({ typography: { h6: { fontSize } } }) => fontSize,
                    fontWeight: ({ typography: { h6: { fontWeight } } }) => fontWeight,
                    letterSpacing: ({ typography: { h6: { letterSpacing } } }) => letterSpacing,
                    lineHeight: ({ typography: { h6: { lineHeight } } }) => lineHeight,
                    "&:hover:after": {
                        backgroundColor: ({palette}) => palette.action.hover,
                        borderRadius: 1
                    },
                    "&:after": {
                        content: "''",
                        position: "absolute",
                        width: ({ spacing }) => `calc(100% + ${spacing(2)})`,
                        height: "100%",
                        mx: -1,
                        borderRadius: 1,
                        transition: ({transitions}) => transitions.create('background-color', {
                            duration: transitions.duration.shorter,
                            easing: transitions.easing.easeOut
                        })
                    }
                } }} />
            <br />
            <Typography variant="body2" component="span">{props.date.toFormat("DDDD")}</Typography>
        </CardContent>
        <Divider />
        <CardContent ref={drop} sx={{ overflow: "auto", px: 0 }}>
            {activities.map(x => <ActivityDragDropBox key={x.id} data={x} findItem={findItem} moveItem={moveItem} component={x.type.configPanel} />)}
        </CardContent>
    </Card>;
}