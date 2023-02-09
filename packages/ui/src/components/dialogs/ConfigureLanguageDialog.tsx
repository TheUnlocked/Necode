import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, List, ListItemButton, ListItemIcon, ListItemText, Radio } from "@mui/material";
import { useState } from "react";
import { LanguageDescription } from "@necode-org/plugin-dev";
import useDirty from "~shared-ui/hooks/useDirty";

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

    const [selectedLanguage, setSelectedLanguage] = useState(enabledLanguage);
    const [isDirty, markDirty, clearDirty] = useDirty();

    function close() {
        onClose();
        clearDirty();
    }

    function saveAndClose() {
        if (selectedLanguage) {
            saveEnabledLanguage(selectedLanguage);
        }
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
                    onClick={() => {
                        setSelectedLanguage(language);
                        markDirty();
                    }}>
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