import { GetServerSideProps, NextPage } from "next";
import { useRouter } from "next/router";
import { useContext, useEffect, useMemo, useState } from "react";
import { MetaTransformerContext } from "../../../../../src/contexts/MetaTransformerContext";
import $me from "../../../../api/classroom/[classroomId]/me";
import { Button, Toolbar, Select, MenuItem, Stack, ToggleButton } from "@mui/material";
import { ArrowBack, Code } from "@mui/icons-material";
import testBasedActivityDescription from "../../../../../src/activities/html-test-based";
import canvasActivityDescription from "../../../../../src/activities/canvas";
import { Box, SxProps } from "@mui/system";
import allLanguages from "../../../../../src/languages/allLanguages";
import LanguageDescription from "../../../../../src/languages/LangaugeDescription";
import useImperativeDialog from "../../../../../src/hooks/ImperativeDialogHook";
import sortByProperty from "../../../../../src/util/sortByProperty";
import { flip, make } from "../../../../../src/util/fp";
import Lazy from "../../../../../src/components/Lazy";
import ConfigureLanguageDialog from "../../../../../src/components/ConfigureLanguageDialog";

interface StaticProps {
    classroomId: string;
}

const Page: NextPage<StaticProps> = ({ classroomId }) => {
    const router = useRouter();
    const metaTransformer = useContext(MetaTransformerContext);

    useEffect(() => {
        metaTransformer({ path: [
            { label: 'To Be Named', href: '/' },
            { label: 'Class Name', href: `/classroom/${classroomId}` },
            { label: 'Manage', href: `/classroom/${classroomId}/manage` },
            { label: 'Activity Name', href: location.href }
        ] });
    }, [metaTransformer, classroomId]);

    const activity = testBasedActivityDescription;

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

    const [activityConfig, setActivityConfig] = useState(activity.defaultConfig);

    const [configureLanguagesDialog, openConfigureLanguagesDialog] = useImperativeDialog(ConfigureLanguageDialog, {
        availableLanguages: supportedLanguages,
        enabledLanguages,
        saveEnabledLanguages: langs => setEnabledLanguages(sortByProperty(langs, "name")),
        unsupportedLanguages: useMemo(() => allLanguages.filter(x => !supportedLanguages.includes(x)), [supportedLanguages])
    });

    const [isPreview, setIsPreview] = useState(false);

    if (!activity.configPage) {
        router.push(`/classroom/${classroomId}/manage`);
        return null;
    }

    return <>
        {configureLanguagesDialog}
        <Toolbar variant="dense" sx={{
            minHeight: "36px",
            px: "16px !important",
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between"
        }}>
            <Button size="small" startIcon={<ArrowBack/>} onClick={() => router.push(`/classroom/${classroomId}/manage`)}>
                Return to Manage Classroom
            </Button>
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
            "--header-height": "100px",
            height: `calc(100vh - var(--header-height))`,
            "& .reflex-container > .reflex-element": {
                overflow: "hidden"
            }
        } as SxProps}>
            <Lazy show={isPreview} keepInDom>
                <activity.activityPage
                    id={""}
                    activityConfig={activityConfig}
                    classroomId={classroomId}
                    language={selectedLanguage} />
            </Lazy>
            <Lazy show={!isPreview}>
                <activity.configPage
                    id={""}
                    activityConfig={activityConfig}
                    onActivityConfigChange={setActivityConfig}
                    classroomId={classroomId}
                    language={selectedLanguage} />
            </Lazy>
        </Box>
    </>;
};

export const getServerSideProps: GetServerSideProps<StaticProps> = async ctx => {
    const classroomId = ctx.params?.classroomId;
    
    if (typeof classroomId !== 'string') {
        return {
            notFound: true
        };
    }

    const { data } = await $me.GET.execute(ctx.req, { query: { classroomId }, body: undefined });

    if (data?.attributes.role !== 'Instructor') {
        return {
            notFound: true
        };
    }

    return {
        props: {
            classroomId
        }
    };
}

export default Page;