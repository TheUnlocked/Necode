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
import allActivities from "~core/activities/allActivities";
import allLanguages from "~core/languages/allLanguages";
import useImperativeDialog from "~shared-ui/hooks/useImperativeDialog";
import SubmissionsDialog from "~ui/components/dialogs/SubmissionsDialog";
import { ClassroomRole } from "~database";
import NotFoundPage from "../../404";
import supportsLanguage from "~core/activities/supportsLanguage";
import { curry } from "lodash";
import useNecodeFetch from '~shared-ui/hooks/useNecodeFetch';
import useImported from '~shared-ui/hooks/useImported';
import { typeAssert } from '~utils/typeguards';
import { RtcProvider } from '~shared-ui/hooks/RtcHooks';
import { ActivitySubmissionEntity } from '~api/src/entities/ActivitySubmissionEntity';
import { SubmissionProvider } from '~shared-ui/hooks/useSubmissions';

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

    const activity = allActivities.find(x => x.id === activityEntity?.attributes.activityType);

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

    let instructorToolbar: JSX.Element | undefined;
    
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
                <Stack direction="row" alignItems="center" spacing={0.5}>
                    {submissions.length > 0
                        ? <Chip color={hasNewSubmissions ? "secondary" : "primary"} variant="filled" size="small" label={submissions.length} />
                        : undefined}
                    <Button size="small" startIcon={<AssignmentTurnedIn/>} onClick={viewSubmissions}>
                        View Submissions
                    </Button>
                </Stack>
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

    if (!socketInfo || (activity && !ActivityPage)) {
        return <>
            {instructorToolbar}
            <StatusPage primary="Loading..." />
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

    const enabledLanguages = activityEntity!.attributes.enabledLanguages.length === 0
        ? allLanguages.filter(curry(supportsLanguage)(activity))
        : allLanguages.filter(x => activityEntity!.attributes.enabledLanguages.includes(x.name));

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

    // Typescript isn't smart enough to infer this on its own
    typeAssert(ActivityPage !== undefined);

    return <>
        {instructorToolbar}
        {isInstructor ? submissionsDialog : undefined}
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
                            const { submissions, loadSubmission } = data;
                            setSubmissions(submissions);
                            loadSubmissionRef.current = loadSubmission;
                        }
                    }}>
                    <ActivityPage
                        key={activityEntity!.id}
                        id={activityEntity!.id}
                        activityConfig={activityEntity!.attributes.configuration}
                        classroomId={classroomId}
                        language={enabledLanguages[0]} />
                </SubmissionProvider>
            </RtcProvider>
        </Box>
    </>;
};

export default Page;