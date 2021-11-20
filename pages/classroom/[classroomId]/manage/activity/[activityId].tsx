import { GetServerSideProps, NextPage } from "next";
import { useRouter } from "next/router";
import { useContext, useEffect, useMemo, useState } from "react";
import { MetaTransformerContext } from "../../../../../src/contexts/MetaTransformerContext";
import { Button, Toolbar, Select, MenuItem, Stack, ToggleButton, Skeleton, Paper } from "@mui/material";
import { ArrowBack, Code } from "@mui/icons-material";
import { Box, SxProps } from "@mui/system";
import allLanguages from "../../../../../src/languages/allLanguages";
import LanguageDescription from "../../../../../src/languages/LangaugeDescription";
import useImperativeDialog from "../../../../../src/hooks/ImperativeDialogHook";
import sortByProperty from "../../../../../src/util/sortByProperty";
import { flip, make } from "../../../../../src/util/fp";
import Lazy from "../../../../../src/components/Lazy";
import ConfigureLanguageDialog from "../../../../../src/components/ConfigureLanguageDialog";
import useGetRequest from "../../../../../src/api/client/GetRequestHook";
import { ActivityEntity } from "../../../../../src/api/entities/ActivityEntity";
import apiClassroomMe from "../../../../api/classroom/[classroomId]/me";
import apiActivityOne from "../../../../api/classroom/[classroomId]/activity/[activityId]";
import allActivities from "../../../../../src/activities/allActivities";
import useSocket from "../../../../../src/hooks/SocketHook";

interface StaticProps {
    classroomId: string;
    activityId: string;
    date: string;
}

const Page: NextPage<StaticProps> = ({ classroomId, date, activityId }) => {
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

    const activityEndpoint = `/api/classroom/${classroomId}/activity/${activityId}`;
    const { data: activityEntity } = useGetRequest<ActivityEntity>(activityEndpoint);

    const activity = useMemo(() => allActivities.find(x => x.id === activityEntity?.attributes.activityType), [activityEntity]);

    const supportedLanguages = useMemo(
        () => allLanguages.filter(({ features }) => activity?.supportedFeatures.every(f => features.includes(f))),
        [activity]
    );

    const [enabledLanguages, setEnabledLanguages] = useState(supportedLanguages);
    const [selectedLanguage, setSelectedLanguage] = useState(enabledLanguages[0]);

    useEffect(() => {
        if (!enabledLanguages.includes(selectedLanguage)) {
            setSelectedLanguage(enabledLanguages[0]);
        }
    }, [enabledLanguages, selectedLanguage]);

    const [activityConfig, setActivityConfig] = useState(activityEntity?.attributes.configuration);

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (activityEntity && supportedLanguages) {
            setIsLoading(notYetFinished => {
                if (notYetFinished) {
                    setActivityConfig(activityEntity.attributes.configuration);

                    const enabledLanguages = activityEntity.attributes.enabledLanguages.length === 0
                        ? supportedLanguages
                        : activityEntity.attributes.enabledLanguages
                            .map(x => supportedLanguages.find(l => l.name === x))
                            .filter(x => x !== undefined) as LanguageDescription[];
                            
                    setEnabledLanguages(enabledLanguages);
                    setSelectedLanguage(enabledLanguages[0])
                }
                return false;
            });
        }
    }, [activityEntity, supportedLanguages]);

    const [configureLanguagesDialog, openConfigureLanguagesDialog] = useImperativeDialog(ConfigureLanguageDialog, {
        availableLanguages: supportedLanguages,
        enabledLanguages,
        saveEnabledLanguages: langs => setEnabledLanguages(sortByProperty(langs, "name")),
        unsupportedLanguages: useMemo(() => allLanguages.filter(x => !supportedLanguages.includes(x)), [supportedLanguages])
    });

    const [isPreview, setIsPreview] = useState(false);
    
    if (isLoading) {
        return <>
            <Toolbar variant="dense" sx={{
                minHeight: "36px",
                px: "16px !important",
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between"
            }}>
                <Button size="small" startIcon={<ArrowBack/>}
                    onClick={() => router.push({
                        pathname: `/classroom/${classroomId}/manage`,
                        hash: date
                    })}>
                    Return to Manage Classroom
                </Button>
                <Stack direction="row" spacing={1}>
                    <Skeleton variant="rectangular" sx={{ borderRadius: "4px", width: "190px" }} />
                    <Skeleton variant="rectangular" sx={{ borderRadius: "4px", width: "46px" }} />
                    <Skeleton variant="rectangular" sx={{ borderRadius: "4px", width: "86px" }} />
                </Stack>
            </Toolbar>
            <Paper elevation={1} sx={{
                height: `calc(100vh - 124px)`,
                display: "flex",
                m: 2,
                mt: 1
            }} />
        </>;
    }

    if (!activity) {
        router.push(`/404`);
        return null;
    }

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
            <Button size="small" startIcon={<ArrowBack/>}
                onClick={() => router.push({
                    pathname: `/classroom/${classroomId}/manage`,
                    hash: date
                })}>
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
                    language={selectedLanguage}
                    socketInfo={undefined} />
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
    const activityId = ctx.params?.activityId;
    
    if (typeof classroomId !== 'string' || typeof activityId !== 'string') {
        return {
            notFound: true
        };
    }

    const { data: meData } = await apiClassroomMe.GET.execute(ctx.req, { query: { classroomId, include: [] }, body: undefined });

    if (meData?.attributes.role !== 'Instructor') {
        return {
            notFound: true
        };
    }

    const { data: activityData } = await apiActivityOne.GET.execute(ctx.req, { query: {
        activityId,
        classroomId,
        include: ['lesson']
    }, body: undefined }) as { data: ActivityEntity<{ lesson: 'deep' }> };

    if (!activityData) {
        return {
            notFound: true
        };
    }

    return {
        props: {
            classroomId,
            activityId,
            date: activityData.attributes.lesson.attributes.date
        }
    };
}

export default Page;