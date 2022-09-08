import { NextPage } from "next";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Toolbar, Select, MenuItem, Stack, ToggleButton, Skeleton, Paper } from "@mui/material";
import { ArrowBack, Code, Save } from "@mui/icons-material";
import { Box, SxProps } from "@mui/system";
import allLanguages from "../../../../../src/languages/allLanguages";
import LanguageDescription from "../../../../../src/languages/LangaugeDescription";
import useImperativeDialog from "../../../../../src/hooks/useImperativeDialog";
import sortByProperty from "../../../../../src/util/sortByProperty";
import { flip, make } from "../../../../../src/util/fp";
import Lazy from "../../../../../src/components/Lazy";
import ConfigureLanguageDialog from "../../../../../src/components/dialogs/ConfigureLanguageDialog";
import { useGetRequest, useGetRequestImmutable } from "../../../../../src/api/client/GetRequestHook";
import { ActivityEntity } from "../../../../../src/api/entities/ActivityEntity";
import allActivities from "../../../../../src/activities/allActivities";
import useDirty from "../../../../../src/hooks/useDirty";
import { ClassroomMemberEntity } from "../../../../../src/api/entities/ClassroomMemberEntity";
import NotFoundPage from "../../../../404";
import supportsLanguage from "../../../../../src/activities/supportsLanguage";
import { curry } from "lodash";
import useNecodeFetch from '../../../../../src/hooks/useNecodeFetch';

interface StaticProps {
    classroomId: string;
    activityId: string;
}

const Page: NextPage = () => {
    const router = useRouter();
    const classroomId = router.query.classroomId;
    const activityId = router.query.activityId;

    const { data, error, isLoading } = useGetRequestImmutable<ClassroomMemberEntity>(classroomId ? `/api/classroom/${classroomId}/me` : null);

    if (!classroomId || !activityId || isLoading) {
        return null;
    }

    if (typeof classroomId !== 'string' || typeof activityId !== 'string' || error || data?.attributes.role !== 'Instructor') {
        return <NotFoundPage />;
    }
    
    return <PageContent classroomId={classroomId} activityId={activityId} />;
};

const PageContent: NextPage<StaticProps> = ({ classroomId, activityId }) => {
    const router = useRouter();

    const activityEndpoint = `/api/classroom/${classroomId}/activity/${activityId}?include=lesson`;
    const { data: activityEntity, mutate } = useGetRequest<ActivityEntity<{ lesson: 'deep' }>>(activityEndpoint);

    const activity = useMemo(() => allActivities.find(x => x.id === activityEntity?.attributes.activityType), [activityEntity]);

    const supportedLanguages = useMemo(
        () => activity ? allLanguages.filter(curry(supportsLanguage)(activity)) : allLanguages,
        [activity]
    );

    const [enabledLanguages, setEnabledLanguages] = useState(supportedLanguages);
    const [selectedLanguage, setSelectedLanguage] = useState(enabledLanguages[0]);

    useEffect(() => {
        if (!enabledLanguages.includes(selectedLanguage)) {
            setSelectedLanguage(enabledLanguages[0]);
        }
    }, [enabledLanguages, selectedLanguage]);

    const [isDirty, markDirty, clearDirty] = useDirty();
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
        saveEnabledLanguages: langs => {
            markDirty();
            setEnabledLanguages(sortByProperty(langs, "name"))
        },
        unsupportedLanguages: useMemo(() => allLanguages.filter(x => !supportedLanguages.includes(x)), [supportedLanguages])
    });

    const { download, upload } = useNecodeFetch();

    async function save() {
        const patch = {
            configuration: activityConfig,
            enabledLanguages: enabledLanguages.map(x => x.name),
        };

        const updatedActivity = {
            ...activityEntity!,
            attributes: {
                ...activityEntity!.attributes,
                ...patch,
            }
        };

        mutate(async () => {
            await upload(`/api/classroom/${classroomId}/activity/${activityId}`, {
                method: 'PATCH',
                body: JSON.stringify(patch)
            });
            clearDirty();
            return updatedActivity;
        }, {
            optimisticData: updatedActivity,
            rollbackOnError: true,
        });
    }

    const unsavedWarnMessage = 'Changes you made may not be saved.';

    const beforeUnloadHandler = useCallback((e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = unsavedWarnMessage;
        return unsavedWarnMessage;
    }, []);
    const routeChangeStartHandler = useCallback((path: string) => {
        if (router.asPath !== path && !confirm(unsavedWarnMessage)) {
            throw 'Cancel route change';
        }
    }, [router]);

    useEffect(() => {
        if (isDirty) {
            window.addEventListener('beforeunload', beforeUnloadHandler);
            router.events.on('routeChangeStart', routeChangeStartHandler);
            return () => {
                window.removeEventListener('beforeunload', beforeUnloadHandler);
                router.events.off('routeChangeStart', routeChangeStartHandler);
            };
        }
    }, [isDirty, router, beforeUnloadHandler, routeChangeStartHandler]);

    const [isPreview, setIsPreview] = useState(false);
    const unloadPreviewRef = useRef<() => void>(() => {});

    async function returnToManage() {
        let date = activityEntity?.attributes.lesson.attributes.date;
        if (!date) {
            const result = await download<ActivityEntity<{ lesson: 'deep' }>>(`/api/classroom/${classroomId}/activity/${activityId}?include=lesson`);
            date = result.attributes.lesson.attributes.date;
        }
        router.push({
            pathname: `/classroom/${classroomId}/manage`,
            hash: date
        });
    }

    const handleActivityConfigChange = useCallback((newConfig: any) => {
        markDirty();
        unloadPreviewRef.current();
        setActivityConfig(newConfig);
    }, []);
    
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
                    onClick={returnToManage}>
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
            "& > * + *": {
                ml: 1
            }
        }}>
            <Button size="small" startIcon={<ArrowBack/>}
                onClick={returnToManage}>
                Return to Manage Classroom
            </Button>
            <Button size="small" startIcon={<Save/>} onClick={save} disabled={!isDirty}>Save Changes</Button>
            <Stack direction="row" justifyContent="flex-end" flexGrow={1} spacing={1}>
                <Button size="small" startIcon={<Code/>} onClick={() => openConfigureLanguagesDialog()}>Configure Languages</Button>
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
            <Lazy show={isPreview} keepInDom unloadRef={unloadPreviewRef}>
                <activity.activityPage
                    id={""}
                    activityConfig={activityConfig}
                    classroomId={classroomId}
                    language={selectedLanguage}
                    socketInfo={undefined}
                    onSaveDataChange={() => {}} />
            </Lazy>
            <Lazy show={!isPreview}>
                <activity.configPage
                    id={""}
                    activityConfig={activityConfig}
                    onActivityConfigChange={handleActivityConfigChange}
                    classroomId={classroomId}
                    language={selectedLanguage} />
            </Lazy>
        </Box>
    </>;
};

export default Page;