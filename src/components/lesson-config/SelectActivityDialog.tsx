import { Code } from "@mui/icons-material";
import { Dialog, DialogTitle, List, ListItemButton, ListItemIcon, ListItemSecondaryAction, ListItemText, Stack, Tooltip } from "@mui/material";
import { Box } from "@mui/system";
import { curry } from "lodash";
import ActivityDescription from "../../activities/ActivityDescription";
import allActivities from "../../activities/allActivities";
import supportsLanguage from "../../activities/supportsLanguage";
import allLanguages from "../../languages/allLanguages";

interface SelectActivityDialogProps {
    open: boolean;
    onClose(): void;
    onSelectActivity?: (activity: ActivityDescription<any>) => void;
}

const supportedLanguagesByActivity = Object.fromEntries(allActivities.map(a => [
    a.id,
    allLanguages.filter(curry(supportsLanguage)(a))
]));

export default function SelectActivityDialog({
    open,
    onClose,
    onSelectActivity
}: SelectActivityDialogProps) {
    return <Dialog open={open} onClose={onClose}>
        <DialogTitle>Pick an activity...</DialogTitle>
        <List sx={{ overflow: "auto" }}>
            {allActivities.map(activity => <ListItemButton key={activity.id} onClick={() => {
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