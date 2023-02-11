import { Code } from "@mui/icons-material";
import { Box, Button, Paper, Skeleton, SxProps, ToggleButton } from "@mui/material";
import { LazyImportable } from '@necode-org/activity-dev';
import { LanguageDescription } from '@necode-org/plugin-dev';
import { NextPage } from "next";
import { useRouter } from "next/router";
import { useSnackbar } from 'notistack';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityEntity } from "~api/entities/ActivityEntity";
import { ClassroomMemberEntity } from "~api/entities/ClassroomMemberEntity";
import useDirty from "~shared-ui/hooks/useDirty";
import { useGetRequest, useGetRequestImmutable } from "~shared-ui/hooks/useGetRequest";
import useImperativeDialog from "~shared-ui/hooks/useImperativeDialog";
import useNecodeFetch from '~shared-ui/hooks/useNecodeFetch';
import { usePlugins } from '~shared-ui/hooks/usePlugins';
import { MockSubmissionProvider } from '~shared-ui/hooks/useSubmissions';
import ConfigureLanguageDialog from "~ui/components/dialogs/ConfigureLanguageDialog";
import InstructorToolbar from '~ui/components/InstructorToolbar';
import StatusPage from '~ui/components/layouts/StatusPage';
import useAsyncMemo from '~shared-ui/hooks/useAsyncMemo';
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

    const { languages, getActivity, getLanguagesWithFeatures, hasFeature, getFeatureImpl } = usePlugins();

    const activity = getActivity(activityEntity?.attributes.activityType);

    const supportedLanguages = useMemo(
        () => activity ? getLanguagesWithFeatures(activity.requiredFeatures) : [],
        [activity, getLanguagesWithFeatures]
    );

    const [language, setEnabledLanguage] = useState<LanguageDescription | undefined>(languages[0]);

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
        enabledLanguage: language,
        saveEnabledLanguage: lang => {
            markDirty();
            setEnabledLanguage(lang);
        },
    });

    const { download, upload } = useNecodeFetch();

    async function save() {
        if (!language) {
            enqueueSnackbar('Cannot save when no language is selected.', { variant: 'error' });
            return;
        }
        const patch = {
            configuration: activityConfig,
            enabledLanguages: [language.name],
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
    
    const hasRequiresBrowser = hasFeature(language?.name, 'requires/browser');
    const requiresBrowser = useAsyncMemo(
        async () => getFeatureImpl(language?.name, ['requires/browser']),
        [language, getFeatureImpl]
    );

    const completedSetup = useAsyncMemo(async () => {
        const impl = await getFeatureImpl(language?.name, ['requires/setup']);
        await impl?.requires.setup.setup();
        return true;
    }, [language, getFeatureImpl]);

    const featureObj = useAsyncMemo(
        async () => activity && language
            ? getFeatureImpl(language.name, activity.requiredFeatures)
            : undefined,
        [activity, language, getFeatureImpl]
    );

    const emptyPage = <Paper elevation={1} sx={{
        height: `calc(100vh - 124px)`,
        display: "flex",
        m: 2,
        mt: 1
    }} />;

    if (isLoading) {
        return <>
            <InstructorToolbar onReturnToManage={returnToManage}>
                <Skeleton variant="rectangular" sx={{ borderRadius: "4px", width: "190px" }} />
                <Skeleton variant="rectangular" sx={{ borderRadius: "4px", width: "46px" }} />
                <Skeleton variant="rectangular" sx={{ borderRadius: "4px", width: "86px" }} />
            </InstructorToolbar>
            {emptyPage}
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

    const instructorToolbar = <>
        {configureLanguageDialog}
        <InstructorToolbar onReturnToManage={returnToManage} onSave={save} canSave={isDirty}>
            {supportedLanguages.length > 1
                ? <Button size="small" startIcon={<Code/>} onClick={() => openConfigureLanguageDialog()}>Configure Language</Button>
                : undefined}
            <ToggleButton value="preview" color="primary" sx={{ height: "32px" }}
                selected={isPreview}
                onChange={make(setIsPreview, flip)}>Preview</ToggleButton>
        </InstructorToolbar>
    </>;

    if (!language) {
        return <>
            {instructorToolbar}
            <StatusPage
                primary="No Language Available"
                body="This activity does not support any languages. This may be some kind of bug." />
        </>;
    }

    if (hasRequiresBrowser && requiresBrowser?.requires.browser.isCompatible() === false) {
        const recommended = requiresBrowser?.requires.browser.getRecommendedBrowsers();
        const recommendedPhrase
            = (recommended.length > 0 ? '. Try switching to ' : '')
            + recommended.slice(0, -1).join(', ')
            + (recommended.length > 2 ? ',' : '')
            + (recommended.length > 1 ? ' or ' + recommended.at(-1) : '')
            + '.';
        
        return <>
            {instructorToolbar}
            <StatusPage
                primary="Incompatible"
                body={`The selected language is incompatible with your browser${recommendedPhrase}`} />
        </>;
    }

    if (!featureObj || !completedSetup) {
        return <>
            {instructorToolbar}
            {emptyPage}
        </>;
    }

    return <>
        {instructorToolbar}
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
                        language={language}
                        features={featureObj} />
                </MockSubmissionProvider>} />
            <LazyImportable show={!isPreview} importable={activity.configPage} render={
                ActivityConfigPage => <ActivityConfigPage
                    id={""}
                    activityConfig={activityConfig}
                    onActivityConfigChange={handleActivityConfigChange}
                    classroomId={classroomId}
                    language={language}
                    features={featureObj} />} />
        </Box>
    </>;
};

export default Page;