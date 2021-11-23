import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, List, ListItemButton, ListItemText } from "@mui/material";
import { ActivitySubmissionEntity } from "../api/entities/ActivitySubmissionEntity";

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
        return <ListItemButton key={submission.id} onClick={() => {
            onPickSubmission(submission);
            onClose();
        }}>
            <ListItemText
                primary={`${submission.attributes.user.attributes.displayName} (${submission.attributes.user.attributes.username})`}
                secondary={`Version ${submission.attributes.version}`} />
        </ListItemButton>;
    }

    return <Dialog fullWidth open={open} onClose={onClose}>
        <DialogTitle>Submissions</DialogTitle>
        <DialogContent>
            <DialogContentText>Pick a submission to load into your editor</DialogContentText>
        </DialogContent>
        <List>
            {submissions.map(getMenuItem)}
        </List>
        <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
        </DialogActions>
    </Dialog>;
}