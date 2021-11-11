import { Add, TextFields } from "@mui/icons-material";
import { Button, Card, CardContent, Divider, IconButton, Paper, Stack, TextField, Typography } from "@mui/material";
import { Box, SxProps } from "@mui/system";
import { DateTime } from "luxon";
import { useCallback, useState } from "react";
import { useDrop } from "react-dnd";
import ActivityDescription from "../../activities/ActivityDescription";
import allActivities from "../../activities/allActivities";
import { ActivityEntity } from "../../api/entities/ActivityEntity";
import { ActivityDragDropBox, activityDragDropType } from "./ActivityDragDropBox";
import DefaultActivityWidget from "./DefaultActivityWidget";
import textInputDescription from "./textInputDescription";

function getActivityDescription(name: string) {
    return allActivities.find(x => x.id === name);
}

interface ActivityListPaneProps {
    sx: SxProps,
    date: DateTime,
    classroom: string
}

export default function ActivityListPane({
    sx,
    classroom,
    date
}: ActivityListPaneProps) {
    const [, drop] = useDrop(() => ({ accept: activityDragDropType }));

    const [, trashDrop] = useDrop<ActivityEntity, unknown, unknown>(() => ({
        accept: activityDragDropType,
        drop(item) {
            setActivities(activities => activities.filter(x => x.id !== item.id));
        }
    }));

    async function addActivity(activity: ActivityDescription<any>) {
        
    }

    const [activities, setActivities] = useState<ActivityEntity[]>([]);

    const findItem = useCallback((id: string) => {
        return { index: activities.findIndex(x => x.id === id) };
    }, [activities]);

    const moveItem = useCallback((id: string, to: number) => {
        const newArr = [...activities];
        const [oldElt] = newArr.splice(activities.findIndex(x => x.id === id), 1);
        newArr.splice(to, 0, oldElt);
        setActivities(newArr);
    }, [activities]);

    function setActivityConfig(index: number, activityConfig: any) {
        setActivities([
            ...activities.slice(0, index),
            {
                ...activities[index],
                attributes: {
                    ...activities[index].attributes,
                    configuration: activityConfig
                }
            },
            ...activities.slice(index + 1)
        ]);
    }

    function makeWidget(activityEntity: ActivityEntity, index: number) {
        const activity = getActivityDescription(activityEntity.attributes.activityType);

        if (!activity) {
            console.error(`Invalid entity type ${activityEntity.attributes.activityType}`);
            return null;
        }

        return <ActivityDragDropBox
            key={activityEntity.id}
            id={activityEntity.id}
            activity={activity}
            classroom={classroom}
            activityConfig={activityEntity.attributes.configuration}
            onActivityConfigChange={x => setActivityConfig(index, x)}
            findItem={findItem}
            moveItem={moveItem} />;
    }

    return <Card sx={sx}>
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
            <Typography variant="body2" component="span">{date.toFormat("DDDD")}</Typography>
        </CardContent>
        <Divider />
        <Box sx={{ backgroundColor: ({palette}) => palette.background.default, p: 1 }}>
            <Stack direction="row" spacing={1}>
                <IconButton><Add/></IconButton>
                <IconButton onClick={() => addActivity(textInputDescription)}><TextFields/></IconButton>
                <Stack direction="row" justifyContent="end" spacing={1} flexGrow={1}>
                    <Button variant="outlined" color="error" disableRipple ref={trashDrop}>Drag here to delete</Button>
                </Stack>
            </Stack>
        </Box>
        <Box ref={drop}>
            {activities.map(makeWidget)}
        </Box>
    </Card>;
}