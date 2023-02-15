import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, List, ListItemButton, ListItemIcon, ListItemText, Radio } from "@mui/material";
import { LanguageDescription } from "@necode-org/plugin-dev";
import { useLocalCachedState } from '@necode-org/activity-dev';

interface ConfigureLanguageDialogProps {
    open: boolean;
    onClose(): void;
    availableLanguages: LanguageDescription[];
    enabledLanguage: LanguageDescription | undefined;
    saveEnabledLanguage(languages: LanguageDescription): void;
}

export default function ConfigureLanguageDialog(props: ConfigureLanguageDialogProps) {
    const {
        open,
        onClose,
        availableLanguages,
        enabledLanguage,
        saveEnabledLanguage
    } = props;

    const [selectedLanguage, setSelectedLanguage, commit, revert, isDirty] = useLocalCachedState(enabledLanguage, l => l ? saveEnabledLanguage(l) : null);

    function close() {
        onClose();
        revert();
    }

    function saveAndClose() {
        commit();
        close();
    }

    return <Dialog open={open} onClose={isDirty ? undefined : close}>
        <DialogTitle>Configure Language</DialogTitle>
        <DialogContent>
            <DialogContentText>This activity will be available in the selected langauge.</DialogContentText>
        </DialogContent>
        <List>
            {availableLanguages.map(language =>
                <ListItemButton key={language.name}
                    onClick={() => setSelectedLanguage(language)}>
                    <ListItemIcon>
                        <Radio checked={language === selectedLanguage} />
                    </ListItemIcon>
                    <ListItemIcon>{language.icon ? <language.icon /> : undefined}</ListItemIcon>
                    <ListItemText primary={language.displayName} />
                </ListItemButton>)}
        </List>
        <DialogActions>
            <Button onClick={close}>Cancel</Button>
            <Button disabled={!isDirty} onClick={saveAndClose}>Save</Button>
        </DialogActions>
    </Dialog>;
}