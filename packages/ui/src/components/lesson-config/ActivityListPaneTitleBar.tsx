import { Box, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useMemo } from 'react';
import { useDrag, createEmptyPreviewImage } from 'use-dnd';
import { LessonEntity } from '~api/entities/LessonEntity';
import { lessonDragDropType } from '../../dnd/types';
import useLocalCachedState from '~shared-ui/hooks/useLocalCachedState';
import isContentfulLesson from '../../lessons/isContentfulLesson';
import { Iso8601Date, toLuxon } from '~utils/iso8601';
import DragHandle, { dragHandleSelector } from '~shared-ui/components/DragHandle';

export interface AcitivityListPaneTitleBarProps {
    date: Iso8601Date;
    forTodayOnly: boolean;
    lesson: LessonEntity<{ activities: 'shallow' }> | undefined;
    onDisplayNameChange: (displayName: string) => void;
}

export default function AcitivityListPaneTitleBar({
    date,
    forTodayOnly,
    lesson,
    onDisplayNameChange,
}: AcitivityListPaneTitleBarProps) {
    const [displayName, setDisplayName, commitDisplayName] = useLocalCachedState(lesson?.attributes.displayName ?? '', onDisplayNameChange);

    const [, drag, dragPreview] = useDrag({
        type: lessonDragDropType,
        item: lesson,
    });

    useEffect(() => {
        dragPreview(createEmptyPreviewImage());
    }, [dragPreview]);

    const dragHandleVisible = useMemo(() => isContentfulLesson(lesson) && !forTodayOnly, [lesson, forTodayOnly]);
    
    return <Stack direction="row" alignItems="center" sx={{ px: 1, [`&:hover ${dragHandleSelector}`]: dragHandleVisible ? { visibility: 'visible' } : undefined }}>
        {forTodayOnly ? <Box p={1} /> : <DragHandle innerRef={dragHandleVisible ? drag : undefined} sx={{ px: 1 }} />}
        <Stack sx={{ flexGrow: 1, p: 2, pl: 0 }}>
            <TextField placeholder="New Lesson"
                variant="standard"
                hiddenLabel
                fullWidth
                value={displayName}
                onBlur={commitDisplayName}
                onChange={e => setDisplayName(e.target.value)}
                InputProps={{ disableUnderline: true, sx: ({ typography, transitions }) => ({
                    ...typography.h6,
                    "&:hover:after": {
                        backgroundColor: ({ palette }) => palette.action.hover,
                        borderRadius: 1
                    },
                    "&:after": {
                        content: "''",
                        position: "absolute",
                        width: ({ spacing }) => `calc(100% + ${spacing(2)})`,
                        height: "100%",
                        pointerEvents: "none",
                        mx: -1,
                        borderRadius: 1,
                        transition: transitions.create("background-color", {
                            duration: transitions.duration.shorter,
                            easing: transitions.easing.easeOut
                        })
                    }
                }) }} />
            <Typography variant="body2" component="span">{
                forTodayOnly
                    ? "Today"
                    : toLuxon(date).toFormat("DDDD")
                }</Typography>
        </Stack>
    </Stack>;
}