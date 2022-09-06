import { Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, InputLabel, MenuItem, Select, Typography } from "@mui/material";
import { DateTime } from 'luxon';
import { useMemo, useState } from 'react';
import { LessonEntity } from '../../api/entities/LessonEntity';
import { toLuxon } from '../../util/iso8601';

interface LessonMergeDialogProps {
    open: boolean;
    onClose(): void;
    copy: boolean;
    fromLesson?: LessonEntity;
    toLesson?: LessonEntity;
    onCommit?(mergeType: 'replace' | 'combine'): void;
}

export default function LessonMergeDialog({
    open,
    onClose,
    copy,
    fromLesson,
    toLesson,
    onCommit,
}: LessonMergeDialogProps) {
    const actionVerb = copy ? 'Copy' : 'Move';
    const actionVerbLower = actionVerb.toLowerCase();
    const actionVerbColor = copy ? 'success' : 'primary';
    const actionVerbEmph = <Typography component="span" color={`${actionVerbColor}.main`}>{actionVerbLower}</Typography>;

    const fromLessonText = useMemo(() => {
        return !fromLesson
            ? null
            : fromLesson.attributes.displayName
            ? <Chip size="small" label={fromLesson.attributes.displayName} />
            : <>the lesson on <Chip size="small" label={toLuxon(fromLesson.attributes.date).toLocaleString(DateTime.DATE_FULL)} /></>;
    }, [fromLesson]);

    const toLessonText = useMemo(() => {
        return !toLesson
            ? null
            : toLesson.attributes.displayName
            ? <Chip size="small" label={toLesson.attributes.displayName} />
            : <>the lesson on <Chip size="small" label={toLuxon(toLesson.attributes.date).toLocaleString(DateTime.DATE_FULL)} /></>;
    }, [toLesson]);
    
    const toLessonTextVague = useMemo(() => {
        return !toLesson
            ? null
            : toLesson.attributes.displayName
            ? <Chip size="small" label={toLesson.attributes.displayName} />
            : 'a lesson';
    }, [toLesson]);

    const toDateString = toLesson ? toLuxon(toLesson.attributes.date).toLocaleString(DateTime.DATE_FULL) : '';

    const [mergeType, setMergeType] = useState('combine');

    return <Dialog fullWidth open={open} onClose={onClose}>
        <DialogTitle>{actionVerb} Lesson Merge Conflict</DialogTitle>
        <DialogContent>
            <DialogContentText>
                You are attempting to {actionVerbEmph} {fromLessonText} to <Chip size="small" label={toDateString} />,
                but {toLessonTextVague} already exists on that date.
                Necode can still {actionVerbLower} the lesson, but you need to tell it how.
            </DialogContentText>
            <FormControl sx={{ my: 2, width: '100%' }}>
                <InputLabel htmlFor="lesson-merge-dialog-merge-method-select-label">Merge method</InputLabel>
                <Select autoFocus
                    label="Merge method" labelId="lesson-merge-dialog-merge-method-select-label"
                    value={mergeType} onChange={e => setMergeType(e.target.value)}>
                    <MenuItem value="replace">Replace</MenuItem>
                    <MenuItem value="combine">Combine</MenuItem>
                </Select>
            </FormControl>
            <DialogContentText>
                {mergeType === 'combine'
                    ? <>
                    With the <Chip size="small" label="combine" /> merge method, all of the activities in {fromLessonText} will be appended
                    to {toLessonText}, and the lesson title will be replaced.
                    </>
                : mergeType === 'replace'
                    ? <>
                    With the <Chip size="small" label="replace" /> merge method, {toLessonText} will be completely scrapped and replaced
                    with {fromLessonText}.
                    </>
                : <>Unknown merge method <Chip size="small" label={mergeType} /></>}
            </DialogContentText>
        </DialogContent>
        <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="contained" color={actionVerbColor} onClick={() => onCommit?.(mergeType as 'replace' | 'combine')}>{actionVerb}</Button>
        </DialogActions>
    </Dialog>;
}