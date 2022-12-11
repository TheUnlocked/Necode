import { NextPage } from "next";
import { useRouter } from "next/router";
import { useCallback, useState } from "react";
import { Button, Chip, Stack, Toolbar } from "@mui/material";
import { ArrowBack, AssignmentTurnedIn, Close } from "@mui/icons-material";
import { Box } from "@mui/system";
import { ClassroomMemberEntity } from "../../../src/api/entities/ClassroomMemberEntity";
import { useGetRequest, useGetRequestImmutable } from "../../../src/api/client/GetRequestHook";
import { useSocket } from "../../../src/hooks/useSocket";
import StatusPage from "../../../src/components/StatusPage";
import { ActivityEntity } from "../../../src/api/entities/ActivityEntity";
import allActivities from "../../../src/activities/allActivities";
import allLanguages from "../../../src/languages/allLanguages";
import { useSubmissions } from "../../../src/hooks/useSubmissions";
import useImperativeDialog from "../../../src/hooks/useImperativeDialog";
import SubmissionsDialog from "../../../src/components/dialogs/SubmissionsDialog";
import { ClassroomRole } from "@prisma/client";
import NotFoundPage from "../../404";
import supportsLanguage from "../../../src/activities/supportsLanguage";
import { curry } from "lodash";
import useNecodeFetch from '../../../src/hooks/useNecodeFetch';
import useImported from '../../../src/hooks/useImported';
import { typeAssert } from '../../../src/util/typeguards';
import { RtcProvider } from '../../../src/hooks/RtcHooks';
import { useSnackbar } from 'notistack';
import { useLoadingContext } from '../../../src/api/client/LoadingContext';

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

    const { enqueueSnackbar } = useSnackbar();
    const { startUpload, finishUpload } = useLoadingContext();
    const [saveData, setSaveData] = useState<{ data: any }>();

    const handleSubmit = useCallback((data: any) => {
        if (!socketInfo?.socket) {
            enqueueSnackbar('A network error occurrred. Copy your work to a safe place and refresh the page.', { variant: 'error' });
            return Promise.reject();
        }
        startUpload();
        return new Promise<void>((resolve, reject) => {
            socketInfo.socket.emit('submission', data, error => {
                finishUpload();
                if (error) {
                    enqueueSnackbar(error, { variant: 'error' });
                    reject(new Error(error));
                }
                else {
                    enqueueSnackbar('Submission successful!', { variant: 'info' });
                    resolve();
                }
            });
        });
    }, [socketInfo?.socket, enqueueSnackbar, startUpload, finishUpload]);

    const { data: activityEntity } = useGetRequest<ActivityEntity<{ lesson: 'deep' }>>(
        socketInfo?.liveActivityInfo
            ? `/api/classroom/${classroomId}/activity/${socketInfo?.liveActivityInfo.id}${isInstructor ? '?include=lesson' : ''}`
            : null
    );

    const activity = allActivities.find(x => x.id === activityEntity?.attributes.activityType);

    const submissions = useSubmissions(isInstructor ? classroomId : undefined, activity, socketInfo, () => setHasNewSubmissions(true));
    const [hasNewSubmissions, setHasNewSubmissions] = useState(false);

    const [submissionsDialog, openSubmissionsDialog] = useImperativeDialog(SubmissionsDialog, {
        submissions,
        onPickSubmission: s => setSaveData({ data: s.attributes.data })
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
            router.push(`/classroom/${classroomId}/manage#${activityEntity?.attributes.lesson.attributes.date}`);
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
                <ActivityPage
                    key={activityEntity!.id}
                    id={activityEntity!.id}
                    activityConfig={activityEntity!.attributes.configuration}
                    classroomId={classroomId}
                    language={enabledLanguages[0]}
                    onSubmit={handleSubmit}
                    saveData={saveData}
                    onSaveDataChange={setSaveData} />
            </RtcProvider>
        </Box>
    </>;
};

export default Page;