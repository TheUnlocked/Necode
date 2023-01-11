import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, List, ListItemButton, ListItemText, Stack, TextField, Tooltip } from "@mui/material";
import { useCallback, useMemo, useState } from 'react';
import { ActivitySubmissionEntity } from "../../api/entities/ActivitySubmissionEntity";
import userSearchProvider from '../../search/userSearchProvider';

interface SubmissionsDialogProps {
    open: boolean;
    onClose(): void;
    submissions: ActivitySubmissionEntity<{ user: 'deep', activity: 'none' }>[];
    onPickSubmission: (submission: ActivitySubmissionEntity<{ user: 'deep', activity: 'none' }>) => void;
}

export default function SubmissionsDialog({
    open,
    onClose,
    submissions,
    onPickSubmission
}: SubmissionsDialogProps) {

    function getMenuItem(submission: ActivitySubmissionEntity<{ user: 'deep', activity: 'none' }>) {
        return <ListItemButton key={submission.id} dense onClick={() => {
            onPickSubmission(submission);
            onClose();
        }}>
            <ListItemText
                primary={`${submission.attributes.user.attributes.displayName} (${submission.attributes.user.attributes.username})`}
                secondary={`Version ${submission.attributes.version}`} />
        </ListItemButton>;
    }

    const [filter, setFilter] = useState('');

    const filteredSubmissions = useMemo(
        () => submissions
            .map(s => [userSearchProvider.getScore(s.attributes.user, filter), s] as const)
            .filter(([score]) => score > 0)
            .sort(([score1], [score2]) => score2 - score1)
            .map(([, s]) => s),
        [submissions, filter]
    );

    const pickRandomSubmission = useCallback(() => {
        onPickSubmission(filteredSubmissions[Math.floor(Math.random() * filteredSubmissions.length)]);
        onClose();
    }, [filteredSubmissions, onPickSubmission, onClose]);

    return <Dialog fullWidth open={open} onClose={onClose}>
        <DialogTitle>Submissions</DialogTitle>
        <DialogContent sx={{ overflowY: 'hidden' }}>
            <DialogContentText>Pick a submission to load into your editor</DialogContentText>
        </DialogContent>
        <Stack px={4} pb={2} gap={4} direction="row" alignItems="center">
            <TextField label="Search" value={filter} onChange={e => setFilter(e.target.value)}
                variant="standard" size="small" sx={{ flexGrow: 1 }} />
            <Tooltip title="Opens a random submission without showing the student's name" disableInteractive>
                <Button variant="text" onClick={pickRandomSubmission}>Pick&nbsp;Random</Button>
            </Tooltip>
        </Stack>
        <List sx={{ overflowY: 'auto' }}>
            {filteredSubmissions.map(getMenuItem)}
        </List>
        <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
        </DialogActions>
    </Dialog>;
}