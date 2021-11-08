import { GetServerSidePropsContext, GetServerSidePropsResult, NextPage } from "next";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { MetaTransformerContext } from "../../../../src/contexts/MetaTransformerContext";
import { getMe, ResponseData as MeResponseData } from "../../../api/classroom/[classroom]/me";
import { Button, Toolbar, Select, MenuItem, Checkbox, ListItemText, Typography, Stack, DialogProps, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, List, Paper, ListItem, ListItemIcon, ListItemButton, Divider, ToggleButton } from "@mui/material";
import { ArrowBack, Code } from "@mui/icons-material";
import testBasedActivityDescription from "../../../../src/activities/html-test-based";
import canvasActivityDescription from "../../../../src/activities/canvas";
import { Box } from "@mui/system";
import allLanguages from "../../../../src/languages/allLanguages";
import { useMergeReducer } from "../../../../src/hooks/MergeReducerHook";
import LanguageDescription from "../../../../src/languages/LangaugeDescription";
import useImperativeDialog from "../../../../src/hooks/ImperativeDialogHook";
import sortByProperty from "../../../../src/util/sortByProperty";
import { flip, make } from "../../../../src/util/fp";
import Lazy from "../../../../src/components/Lazy";

function ConfigureLanguageDialog(props: {
    open: boolean;
    onClose(): void;
    availableLanguages: LanguageDescription[];
    enabledLanguages: LanguageDescription[];
    unsupportedLanguages: LanguageDescription[];
    saveEnabledLanguages(languages: LanguageDescription[]): void;
}) {
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
            {unsupportedLanguages.length > 0 ? <>
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
            </> : undefined}
        </List>
        <DialogActions>
            <Button onClick={close}>Cancel</Button>
            <Button disabled={!isDirty} onClick={saveAndClose}>Save</Button>
        </DialogActions>
    </Dialog>;
}

const Page: NextPage = dynamic(() => Promise.resolve(() => {
    const router = useRouter();
    const query = router.query;
    const classroom = query.classroom;
    const metaTransformer = useContext(MetaTransformerContext);

    useEffect(() => {
        metaTransformer({ path: [
            { label: 'To Be Named', href: '/' },
            { label: 'Class Name', href: `/classroom/${classroom}` },
            { label: 'Manage', href: `/classroom/${classroom}/manage` },
            { label: 'Activity Name', href: location.href }
        ] });
    }, [metaTransformer, classroom]);

    const activity = testBasedActivityDescription;

    if (!activity.configPage) {
        router.push(`/classroom/${classroom}/manage`);
        return <></>;
    }

    const supportedLanguages = useMemo(
        () => allLanguages.filter(({ features }) => activity.supportedFeatures.every(f => features.includes(f))),
        [activity]
    );

    const [enabledLanguages, setEnabledLanguages] = useState(supportedLanguages);
    const [selectedLanguage, setSelectedLanguage] = useState(enabledLanguages[0]);

    useEffect(() => {
        if (!enabledLanguages.includes(selectedLanguage)) {
            setSelectedLanguage(enabledLanguages[0]);
        }
    }, [enabledLanguages, selectedLanguage]);

    const [activityConfig, dispatchActivityConfig] = useMergeReducer(activity.defaultConfig);

    const [configureLanguagesDialog, openConfigureLanguagesDialog] = useImperativeDialog(ConfigureLanguageDialog, {
        availableLanguages: supportedLanguages,
        enabledLanguages,
        saveEnabledLanguages: langs => setEnabledLanguages(sortByProperty(langs, "name")),
        unsupportedLanguages: useMemo(() => allLanguages.filter(x => !supportedLanguages.includes(x)), [supportedLanguages])
    });

    const [isPreview, setIsPreview] = useState(false);

    return <>
        {configureLanguagesDialog}
        <Toolbar variant="dense" sx={{
            minHeight: "36px",
            px: "16px !important",
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between"
        }}>
            <Button size="small" startIcon={<ArrowBack/>}>Return to Manage Classroom</Button>
            <Stack direction="row" spacing={1}>
                <Button size="small" startIcon={<Code/>} onClick={openConfigureLanguagesDialog}>Configure Languages</Button>
                <Select size="small" sx={{ height: "32px" }}
                    id="language-select-box"
                    value={selectedLanguage}
                    onChange={ev => setSelectedLanguage(ev.target.value as LanguageDescription)}
                    readOnly={enabledLanguages.length === 1}
                    renderValue={lang => lang.displayName}>{
                    enabledLanguages.map(lang =>
                        <MenuItem key={lang.name} value={lang as any}>{lang.displayName}</MenuItem>)
                }</Select>
                <ToggleButton value="preview" color="primary" sx={{ height: "32px" }}
                    selected={isPreview}
                    onChange={make(setIsPreview, flip)}>Preview</ToggleButton>
            </Stack>
        </Toolbar>
        <Box sx={{
            px: 2,
            pb: 2,
            height: `calc(100vh - 100px)`,
            "& .reflex-container > .reflex-element": {
                overflow: "hidden"
            }
        }}>
            <Lazy show={isPreview} keepInDom>
                <activity.activityPage
                    activityConfig={activityConfig}
                    classroom={query.classroom as string}
                    language={selectedLanguage} />
            </Lazy>
            <Lazy show={!isPreview}>
                <activity.configPage
                    activityConfig={activityConfig}
                    onActivityConfigChange={dispatchActivityConfig}
                    classroom={query.classroom as string}
                    language={selectedLanguage} />
            </Lazy>
        </Box>
    </>;
}), { ssr: false });

export async function getServerSideProps(context: GetServerSidePropsContext): Promise<GetServerSidePropsResult<{}>> {
    const { content: { data } } = await getMe(context.req, context.query.classroom as string);

    if (!data || data.attributes.role !== 'Instructor') {
        return {
            notFound: true
        };
    }

    return {
        props: {}
    };
}

export default Page;