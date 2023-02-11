import { NextPage } from "next";
import { useRouter } from "next/router";
import { useRef, useState } from "react";
import { Button, Chip, Stack, Toolbar, Box } from "@mui/material";
import { ArrowBack, AssignmentTurnedIn, Close } from "@mui/icons-material";
import { ClassroomMemberEntity } from "~api/entities/ClassroomMemberEntity";
import { useGetRequest, useGetRequestImmutable } from "~shared-ui/hooks/useGetRequest";
import { useSocket } from "~ui/hooks/useSocket";
import StatusPage from "~ui/components/layouts/StatusPage";
import { ActivityEntity } from "~api/entities/ActivityEntity";
import useImperativeDialog from "~shared-ui/hooks/useImperativeDialog";
import SubmissionsDialog from "~ui/components/dialogs/SubmissionsDialog";
import { ClassroomRole } from "~database";
import NotFoundPage from "../../404";
import useNecodeFetch from '~shared-ui/hooks/useNecodeFetch';
import useImported from '~shared-ui/hooks/useImported';
import { typeAssert } from '~utils/typeguards';
import { RtcProvider } from '~shared-ui/hooks/RtcHooks';
import { ActivitySubmissionEntity } from '~api/entities/ActivitySubmissionEntity';
import { SubmissionProvider } from '~shared-ui/hooks/useSubmissions';
import { usePlugins } from '~shared-ui/hooks/usePlugins';
import useAsyncMemo from '~shared-ui/hooks/useAsyncMemo';

interface StaticProps {
    classroomId: string;
    role?: ClassroomRole;
}

const Page: NextPage = () => {
    const router = useRouter();
    const classroomId = router.query.classroomId;

    const { data, error } = useGetRequestImmutable<ClassroomMemberEntity>(classroomId ? `/api/classroom/${classroomId}/me` : null);

    if (!classroomId) {
        return null;
    }

    if (typeof classroomId !== 'string' || error) {
        return <NotFoundPage />;
    }
    
    return <PageContent classroomId={classroomId} role={data?.attributes.role} />;
};

const PageContent: NextPage<StaticProps> = ({ classroomId, role }) => {
    const router = useRouter();

    const { upload } = useNecodeFetch();

    const isInstructor = role === 'Instructor';

    const socketInfo = useSocket(classroomId);

    const { data: activityEntity } = useGetRequest<ActivityEntity<{ lesson: 'deep' }>>(
        socketInfo?.liveActivityInfo
            ? `/api/classroom/${classroomId}/activity/${socketInfo?.liveActivityInfo.id}${isInstructor ? '?include=lesson' : ''}`
            : null
    );

    const { getActivity, getLanguagesWithFeatures, hasFeature, getFeatureImpl } = usePlugins();

    const activity = getActivity(activityEntity?.attributes.activityType);

    const loadSubmissionRef = useRef<(submission: ActivitySubmissionEntity<{ user: 'deep', activity: 'none' }>) => void>();
    const [submissions, setSubmissions] = useState<readonly ActivitySubmissionEntity<{ user: 'deep', activity: 'none' }>[]>([]);
    const [hasNewSubmissions, setHasNewSubmissions] = useState(false);

    const [submissionsDialog, openSubmissionsDialog] = useImperativeDialog(SubmissionsDialog, {
        submissions,
        onPickSubmission: s => loadSubmissionRef.current?.(s),
    });

    function viewSubmissions() {
        openSubmissionsDialog();
        setHasNewSubmissions(false);
    }

    const [usesSubmissions, setUsesSubmissions] = useState(false);
    let instructorToolbar: JSX.Element | undefined;
    
    function goToManage() {
        if (activityEntity) {
            router.push({
                pathname: `/classroom/${classroomId}/manage/lessons`,
                hash: activityEntity.attributes.lesson.attributes.date,
            });
        }
        else {
            router.push(`/classroom/${classroomId}/manage`);
        }
    }

    async function endActivity() {
        await upload(`/api/classroom/${classroomId}/activity/live`, { method: 'DELETE' });
        goToManage();
    }

    if (isInstructor) {
        if (activity) {
            instructorToolbar = <Toolbar variant="dense" sx={{ minHeight: "36px", px: "16px !important" }}>
                <Stack direction="row" spacing={1} sx={{ flexGrow: 1 }}>
                    <Button size="small" startIcon={<ArrowBack/>} onClick={goToManage}>
                        Return to Manage Classroom
                    </Button>
                    <Button size="small" color="error" startIcon={<Close/>} onClick={endActivity}>
                        End Activity
                    </Button>
                </Stack>
                {usesSubmissions
                    ? <Stack direction="row" alignItems="center" spacing={0.5}>
                        {submissions.length > 0
                            ? <Chip color={hasNewSubmissions ? "secondary" : "primary"} variant="filled" size="small" label={submissions.length} />
                            : undefined}
                        <Button size="small" startIcon={<AssignmentTurnedIn/>} onClick={viewSubmissions}>
                            View Submissions
                        </Button>
                    </Stack>
                    : undefined}
            </Toolbar>;
        }
        else {
            instructorToolbar = <Toolbar variant="dense" sx={{ minHeight: "36px", px: "16px !important" }}>
                <Button size="small" startIcon={<ArrowBack/>} onClick={goToManage}>
                    Return to Manage Classroom
                </Button>
            </Toolbar>;
        }
    }

    const ActivityPage = useImported(activity?.activityPage);

    const supportedLanguages = activity ? getLanguagesWithFeatures(activity.requiredFeatures) : [];

    const language = !activityEntity
        ? undefined
        : activityEntity.attributes.enabledLanguages.length === 0
        ? supportedLanguages[0]
        : supportedLanguages.find(x => activityEntity.attributes.enabledLanguages.includes(x.name));

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
        async () => activity && language ? getFeatureImpl(language.name, activity.requiredFeatures) : undefined,
        [activity, language, getFeatureImpl]
    );

    if (!socketInfo || (activity && !ActivityPage)) {
        return <>
            {instructorToolbar}
            <StatusPage
                primary="Loading..."
                body="Loading Activity..." />
        </>;
    }

    if (!activity) {
        return <>
            {instructorToolbar}
            <StatusPage
                primary="Not Live"
                body="Your instructor hasn't started an activity yet."
            />
        </>;
    }

    if (!language) {
        return <>
            {instructorToolbar}
            <StatusPage
                primary="No Language Available"
                body="This is likely some kind of bug." />
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
                body={`Your browser is incompatible with this activity${recommendedPhrase}`} />
        </>;
    }

    if (!featureObj || !completedSetup) {
        return <>
            {instructorToolbar}
            <StatusPage
                primary="Loading..."
                body={`Loading ${language.displayName} support...`} />
        </>;
    }

    // Typescript isn't smart enough to infer this on its own
    typeAssert(ActivityPage !== undefined);

    return <>
        {instructorToolbar}
        {isInstructor && usesSubmissions ? submissionsDialog : undefined}
        <Box sx={{
            px: 2,
            pb: 2,
            ...isInstructor ? { "--header-height": "100px" } : {},
            height: `calc(100vh - var(--header-height))`,
            "& .reflex-container > .reflex-element": {
                overflow: "hidden"
            }
        }}>
            <RtcProvider socketInfo={socketInfo}>
                <SubmissionProvider
                    classroomId={classroomId}
                    socketInfo={socketInfo}
                    activity={activity}
                    onSubmission={() => setHasNewSubmissions(true)}
                    ref={data => {
                        if (data) {
                            const { areSubmissionsUsed, submissions, loadSubmission } = data;
                            setUsesSubmissions(areSubmissionsUsed);
                            setSubmissions(submissions);
                            loadSubmissionRef.current = loadSubmission;
                        }
                    }}>
                    <ActivityPage
                        key={activityEntity!.id}
                        id={activityEntity!.id}
                        activityConfig={activityEntity!.attributes.configuration}
                        classroomId={classroomId}
                        language={language}
                        features={featureObj} />
                </SubmissionProvider>
            </RtcProvider>
        </Box>
    </>;
};

export default Page;