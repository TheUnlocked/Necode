import { GetServerSideProps, NextPage } from "next";
import { useRouter } from "next/router";
import { useContext, useEffect } from "react";
import { MetaTransformerContext } from "../../../src/contexts/MetaTransformerContext";
import { Button, Toolbar } from "@mui/material";
import { ArrowBack, Close } from "@mui/icons-material";
import { Box } from "@mui/system";
import { ClassroomMemberEntity } from "../../../src/api/entities/ClassroomMemberEntity";
import useGetRequest from "../../../src/api/client/GetRequestHook";
import useSocket from "../../../src/hooks/SocketHook";
import StatusPage from "../../../src/components/StatusPage";
import { useLoadingContext } from "../../../src/api/client/LoadingContext";
import { ActivityEntity } from "../../../src/api/entities/ActivityEntity";
import allActivities from "../../../src/activities/allActivities";
import allLanguages from "../../../src/languages/allLanguages";

interface StaticProps {
    classroomId: string;
}

const Page: NextPage<StaticProps> = ({ classroomId }) => {
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

    const { data: me } = useGetRequest<ClassroomMemberEntity>(`/api/classroom/${classroomId}/me`);
    const isInstructor = me?.attributes.role === 'Instructor';

    const socketInfo = useSocket(classroomId);

    const { data: activityEntity } = useGetRequest<ActivityEntity<{ lesson: 'deep' }>>(
        socketInfo?.liveActivityInfo
            ? `/api/classroom/${classroomId}/activity/${socketInfo?.liveActivityInfo.id}?include=lesson`
            : null
    );

    const activity = allActivities.find(x => x.id === activityEntity?.attributes.activityType);

    if (!socketInfo) {
        return <StatusPage
            primary="Loading..."
        />;
    }

    if (!activity) {
        return <StatusPage
            primary="Not Live"
            body="Your instructor hasn't started an activity yet."
        />;
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
        {isInstructor ? <Toolbar variant="dense" sx={{ minHeight: "36px", px: "16px !important" }}>
            <Button size="small" startIcon={<ArrowBack/>} onClick={goToManage}>
                Return to Manage Classroom
            </Button>
            <Button size="small" color="error" startIcon={<Close/>} onClick={endActivity}>
                End Activity
            </Button>
        </Toolbar> : null}
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
                id={activityEntity!.id}
                activityConfig={activityEntity!.attributes.configuration}
                classroomId={classroomId}
                language={enabledLanguages[0]}
                socketInfo={socketInfo} />
        </Box>
    </>;
};

export const getServerSideProps: GetServerSideProps<StaticProps> = async ctx => {
    if (typeof ctx.params?.classroomId !== 'string') {
        return {
            notFound: true
        };
    }

    return {
        props: {
            classroomId: ctx.params.classroomId
        }
    };
};

export default Page;