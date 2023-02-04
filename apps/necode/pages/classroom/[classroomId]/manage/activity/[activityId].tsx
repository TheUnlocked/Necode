import { ArrowBack, Code, Save } from "@mui/icons-material";
import { Box, Button, Paper, Skeleton, Stack, SxProps, ToggleButton, Toolbar } from "@mui/material";
import { curry } from "lodash";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { useSnackbar } from 'notistack';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityEntity } from "~api/entities/ActivityEntity";
import { ClassroomMemberEntity } from "~api/entities/ClassroomMemberEntity";
import allActivities from "~core/activities/allActivities";
import supportsLanguage from "~core/activities/supportsLanguage";
import allLanguages from "~core/languages/allLanguages";
import { LazyImportable } from "~shared-ui/components/Lazy";
import useDirty from "~shared-ui/hooks/useDirty";
import { useGetRequest, useGetRequestImmutable } from "~shared-ui/hooks/useGetRequest";
import useImperativeDialog from "~shared-ui/hooks/useImperativeDialog";
import useNecodeFetch from '~shared-ui/hooks/useNecodeFetch';
import { MockSubmissionProvider } from '~shared-ui/src/hooks/useSubmissions';
import LanguageDescription from "~shared-ui/types/LanguageDescription";
import ConfigureLanguageDialog from "~ui/components/dialogs/ConfigureLanguageDialog";
import { flip, make } from "~utils/fp";
import NotFoundPage from "../../../../404";

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

    const [enabledLanguage, setEnabledLanguage] = useState<LanguageDescription>(allLanguages[0]);

    const [isDirty, markDirty, clearDirty] = useDirty();
    const [activityConfig, setActivityConfig] = useState(activityEntity?.attributes.configuration);

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (activityEntity && supportedLanguages) {
            setIsLoading(notYetFinished => {
                if (notYetFinished) {
                    setActivityConfig(activityEntity.attributes.configuration);
                            
                    setEnabledLanguage(
                        supportedLanguages.find(l => activityEntity.attributes.enabledLanguages.includes(l.name))
                            ?? supportedLanguages[0]
                    );
                }
                return false;
            });
        }
    }, [activityEntity, supportedLanguages]);

    const [configureLanguageDialog, openConfigureLanguageDialog] = useImperativeDialog(ConfigureLanguageDialog, {
        availableLanguages: supportedLanguages,
        enabledLanguage,
        saveEnabledLanguage: lang => {
            markDirty();
            setEnabledLanguage(lang);
        },
    });

    const { download, upload } = useNecodeFetch();

    async function save() {
        const patch = {
            configuration: activityConfig,
            enabledLanguages: [enabledLanguage.name],
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
            pathname: `/classroom/${classroomId}/manage/lessons`,
            hash: date
        });
    }

    const handleActivityConfigChange = useCallback((newConfig: any) => {
        markDirty();
        unloadPreviewRef.current();
        setActivityConfig(newConfig);
    }, []);

    const { enqueueSnackbar } = useSnackbar();
    
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
        {configureLanguageDialog}
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
                {supportedLanguages.length > 1
                    ? <Button size="small" startIcon={<Code/>} onClick={() => openConfigureLanguageDialog()}>Configure Language</Button>
                    : undefined}
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
            <LazyImportable show={isPreview} keepInDom unloadRef={unloadPreviewRef} importable={activity.activityPage} render={
                ActivityPage => <MockSubmissionProvider value={{
                    submit: async () => {
                        enqueueSnackbar('Submissions are disabled during configuration.', { variant: 'info' });
                    },
                    addSubmissionLoadListener: () => () => {},
                }}>
                    <ActivityPage
                        id={""}
                        activityConfig={activityConfig}
                        classroomId={classroomId}
                        language={enabledLanguage} />
                </MockSubmissionProvider>} />
            <LazyImportable show={!isPreview} importable={activity.configPage} render={
                ActivityConfigPage => <ActivityConfigPage
                    id={""}
                    activityConfig={activityConfig}
                    onActivityConfigChange={handleActivityConfigChange}
                    classroomId={classroomId}
                    language={enabledLanguage} />} />
        </Box>
    </>;
};

export default Page;