import { Code } from "@mui/icons-material";
import { Dialog, DialogTitle, List, ListItemButton, ListItemText, Stack, Tooltip, Box } from "@mui/material";
import { curry } from "lodash";
import ActivityDescription from "~shared-ui/types/ActivityDescription";
import allActivities from "~core/activities/allActivities";
import supportsLanguage from "~core/activities/supportsLanguage";
import allLanguages from "~core/languages/allLanguages";

interface SelectActivityDialogProps {
    open: boolean;
    onClose(): void;
    onSelectActivity?: (activity: ActivityDescription<any>) => void;
}

const selectableActivities = allActivities
    .filter(a => !a.id.startsWith('core/noop/'));

const supportedLanguagesByActivity = Object.fromEntries(
    selectableActivities
        .map(a => [
            a.id,
            allLanguages.filter(curry(supportsLanguage)(a))
        ])
);

export default function SelectActivityDialog({
    open,
    onClose,
    onSelectActivity
}: SelectActivityDialogProps) {
    return <Dialog open={open} onClose={onClose}>
        <DialogTitle>Pick an activity...</DialogTitle>
        <List sx={{ overflow: "auto" }}>
            {selectableActivities.map(activity => <ListItemButton key={activity.id} onClick={() => {
                onSelectActivity?.(activity);
                onClose();
            }}>
                <ListItemText primary={activity.displayName} secondary={activity.id} />
                <Stack direction="row" justifyContent="end" flexWrap="wrap" spacing={1} sx={{ ml: 4, width: 32 * 5 }}>
                    {supportedLanguagesByActivity[activity.id].map(language => (
                        <Box key={language.name} height="32px">
                            <Tooltip title={language.displayName} placement="top" arrow componentsProps={{
                                tooltip: { sx: { mb: "10px !important" } }
                            }} disableInteractive>
                                <Box sx={{ my: 0.5 }}>
                                    {language.icon ? <language.icon /> : <Code />}
                                </Box>
                            </Tooltip>
                        </Box>
                    ))}
                </Stack>
            </ListItemButton>)}
        </List>
    </Dialog>;
}