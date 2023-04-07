import { Code } from "@mui/icons-material";
import { Box, Dialog, DialogTitle, List, ListItemButton, ListItemText, Stack, Tooltip } from "@mui/material";
import { ActivityDescription } from '@necode-org/plugin-dev';
import { useMemo } from 'react';
import { usePlugins } from '~shared-ui/hooks/usePlugins';

interface SelectActivityDialogProps {
    open: boolean;
    onClose(): void;
    onSelectActivity?: (activity: ActivityDescription<any>) => void;
}

export default function SelectActivityDialog({
    open,
    onClose,
    onSelectActivity
}: SelectActivityDialogProps) {
    const { activities, getLanguagesWithFeatures } = usePlugins();

    const selectableActivities = useMemo(() => activities.filter(x => !x.id.startsWith('core/noop')), [activities]);

    const supportedLanguagesByActivity = useMemo(() => Object.fromEntries(
        selectableActivities
            .map(a => [
                a.id,
                getLanguagesWithFeatures(a.requiredFeatures),
            ])
    ), [selectableActivities, getLanguagesWithFeatures]);

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