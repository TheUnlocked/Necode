import { NextPage } from "next";
import { useRouter } from "next/router";
import { useContext, useEffect, useState } from "react";
import { MetaTransformerContext } from "../../../src/contexts/MetaTransformerContext";
import { Button, Chip, Stack, Toolbar } from "@mui/material";
import { ArrowBack, AssignmentTurnedIn, Close } from "@mui/icons-material";
import { Box } from "@mui/system";
import { ClassroomMemberEntity } from "../../../src/api/entities/ClassroomMemberEntity";
import useGetRequest from "../../../src/api/client/GetRequestHook";
import useSocket from "../../../src/hooks/SocketHook";
import StatusPage from "../../../src/components/StatusPage";
import { useLoadingContext } from "../../../src/api/client/LoadingContext";
import { ActivityEntity } from "../../../src/api/entities/ActivityEntity";
import allActivities from "../../../src/activities/allActivities";
import allLanguages from "../../../src/languages/allLanguages";
import { useSubmissions } from "../../../src/hooks/SubmissionHook";
import useImperativeDialog from "../../../src/hooks/ImperativeDialogHook";
import SubmissionsDialog from "../../../src/components/SubmissionsDialog";
import { ClassroomRole } from ".prisma/client";
import NotFoundPage from "../../404";

interface StaticProps {
    classroomId: string;
    role?: ClassroomRole;
}

const Page: NextPage = () => {
    const router = useRouter();
    const classroomId = router.query.classroomId;

    const { data, error } = useGetRequest<ClassroomMemberEntity>(classroomId ? `/api/classroom/${classroomId}/me` : null);

    if (classroomId !== 'string' || error) {
        return <NotFoundPage />;
    }
    
    return <PageContent classroomId={classroomId} role={data?.attributes.role} />;
};

const PageContent: NextPage<StaticProps> = ({ classroomId, role }) => {
    const router = useRouter();
    const metaTransformer = useContext(MetaTransformerContext);
    const { startUpload, finishUpload } = useLoadingContext();

    useEffect(() => {
        metaTransformer({ path: [
            { label: 'Necode', href: '/' },
            { label: 'Class Name', href: `/classroom/${classroomId}` },
            { label: 'Activity Name', href: location.href }
        ] });
    }, [metaTransformer, classroomId]);

    const isInstructor = role === 'Instructor';

    const socketInfo = useSocket(classroomId);

    const submissions = useSubmissions(isInstructor ? classroomId : undefined, socketInfo, () => setHasNewSubmissions(true));
    const [hasNewSubmissions, setHasNewSubmissions] = useState(false);

    const [submissionsDialog, openSubmissionsDialog] = useImperativeDialog(SubmissionsDialog, {
        submissions,
        onPickSubmission: s => setSaveData({ data: s.attributes.data })
    })

    function viewSubmissions() {
        openSubmissionsDialog();
        setHasNewSubmissions(false);
    }

    const [saveData, setSaveData] = useState<{ data: any }>();

    const { data: activityEntity } = useGetRequest<ActivityEntity<{ lesson: 'deep' }>>(
        socketInfo?.liveActivityInfo
            ? `/api/classroom/${classroomId}/activity/${socketInfo?.liveActivityInfo.id}${isInstructor ? '?include=lesson' : ''}`
            : null
    );

    const activity = allActivities.find(x => x.id === activityEntity?.attributes.activityType);

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

    if (!socketInfo) {
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
        ? allLanguages.filter(({features}) => activity.supportedFeatures.every(f => features.includes(f)))
        : allLanguages.filter(x => activityEntity!.attributes.enabledLanguages.includes(x.name));

    function goToManage() {
        if (activityEntity) {
            router.push(`/classroom/${classroomId}/manage#${activityEntity?.attributes.lesson.attributes.date}`);
        }
        else {
            router.push(`/classroom/${classroomId}/manage`);
        }
    }

    function endActivity() {
        startUpload();
        fetch(`/api/classroom/${classroomId}/activity/live`, { method: 'DELETE' })
            .finally(finishUpload);
        goToManage();
    }

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
            <activity.activityPage
                key={activityEntity!.id}
                id={activityEntity!.id}
                activityConfig={activityEntity!.attributes.configuration}
                classroomId={classroomId}
                language={enabledLanguages[0]}
                socketInfo={socketInfo}
                saveData={saveData}
                onSaveDataChange={setSaveData} />
        </Box>
    </>;
};

export default Page;