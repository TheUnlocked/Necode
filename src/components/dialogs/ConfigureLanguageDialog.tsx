import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { useEffect, useState } from "react";
import LanguageDescription from "../../languages/LangaugeDescription";

interface ConfigureLanguageDialogProps {
    open: boolean;
    onClose(): void;
    availableLanguages: LanguageDescription[];
    enabledLanguages: LanguageDescription[];
    unsupportedLanguages: LanguageDescription[];
    saveEnabledLanguages(languages: LanguageDescription[]): void;
}

export default function ConfigureLanguageDialog(props: ConfigureLanguageDialogProps) {
    const {
        open,
        onClose,
        availableLanguages,
        enabledLanguages,
        unsupportedLanguages,
        saveEnabledLanguages
    } = props;

    type TransientLanguageState = { enabled: boolean, language: LanguageDescription };

    const [transientAvailableLanguages, setTransientAvailableLanguages] = useState([] as TransientLanguageState[]);

    useEffect(() => {
        if (!open) {
            setTransientAvailableLanguages([
                ...enabledLanguages
                    .map(x => ({ enabled: true, language: x })),
                ...availableLanguages
                    .filter(x => !enabledLanguages.includes(x))
                    .map(x => ({ enabled: false, language: x }))
            ]);
        }
    }, [open, availableLanguages, enabledLanguages]);

    function close() {
        onClose();
        setIsDirty(false);
    }

    function saveAndClose() {
        saveEnabledLanguages(transientAvailableLanguages.filter(x => x.enabled).map(x => x.language));
        close();
    }

    const [isDirty, setIsDirty] = useState(false);

    function toggleLanguageEnabled(language: LanguageDescription) {
        setTransientAvailableLanguages(states => {
            const currState = states.find(x => x.language === language)!;
            if (currState) {
                currState.enabled = !currState.enabled;
                setIsDirty(true);
                return [...states];
            }
            return states;
        });
    }

    function getMenuItem({ language, enabled }: TransientLanguageState) {
        if (enabled && transientAvailableLanguages.filter(x => x.enabled).length <= 1) {
            // can't interact
            return <ListItem key={language.name}>
                <ListItemIcon>
                    <Checkbox disabled checked />
                </ListItemIcon>
                <ListItemIcon>{language.icon ? <language.icon /> : undefined}</ListItemIcon>
                <ListItemText primary={language.displayName} />
            </ListItem>;
        }
        else {
            // can interact
            return <ListItemButton key={language.name}
                onClick={() => toggleLanguageEnabled(language)}>
                <ListItemIcon>
                    <Checkbox checked={enabled} />
                </ListItemIcon>
                <ListItemIcon>{language.icon ? <language.icon /> : undefined}</ListItemIcon>
                <ListItemText primary={language.displayName} />
            </ListItemButton>;
        }
    }

    return <Dialog open={open} onClose={isDirty ? undefined : close}>
        <DialogTitle>Configure Languages</DialogTitle>
        <DialogContent>
            <DialogContentText>This activity will be available in all of the selected langauges.</DialogContentText>
        </DialogContent>
        <List>
            {transientAvailableLanguages.map(getMenuItem)}
            {/* {unsupportedLanguages.length > 0 ? <>
                <Divider>Unsupported Languages</Divider>
                {unsupportedLanguages.map(language => <ListItem key={language.name}>
                    <ListItemIcon>
                        <Checkbox disabled />
                    </ListItemIcon>
                    {language.icon ? <ListItemIcon sx={{ minWidth: "48px" }}><language.icon sx={{
                        color: ({ palette }) => palette.text.disabled
                    }} /></ListItemIcon> : undefined}
                    <ListItemText primary={language.displayName} primaryTypographyProps={{
                        color: ({ palette }) => palette.text.disabled
                    }} />
                </ListItem>)}
            </> : undefined} */}
        </List>
        <DialogActions>
            <Button onClick={close}>Cancel</Button>
            <Button disabled={!isDirty} onClick={saveAndClose}>Save</Button>
        </DialogActions>
    </Dialog>;
}