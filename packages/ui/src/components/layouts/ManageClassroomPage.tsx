import { Button, Stack, Toolbar, Typography } from "@mui/material";
import { NextPage } from "next";
import { PropsWithChildren, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import NotFoundPage from './NotFoundPage';
import useNecodeFetch from '~shared-ui/hooks/useNecodeFetch';
import { useGetRequest, useGetRequestImmutable } from '../../../../shared-ui/src/hooks/useGetRequest';
import ManageClassroomSidebar, { ManageClassroomSubPageId } from '../ManageClassroomSidebar';
import { ClassroomMemberEntity } from '~api/entities/ClassroomMemberEntity';


export interface ManageClassroomPageProps {
    page: ManageClassroomSubPageId;
    component: NextPage<ManageClassroomPageContentProps>;
}

export interface ManageClassroomPageContentProps {
    classroomId: string;
    me: ClassroomMemberEntity;
}

interface PageContentProps extends PropsWithChildren {
    classroomId: string;
    page: ManageClassroomSubPageId;
}

export default function ManageClassroomPage({ component: Content, page }: ManageClassroomPageProps) {
    const router = useRouter();
    const classroomId = router.query.classroomId;

    const { data, error, isLoading } = useGetRequestImmutable<ClassroomMemberEntity>(classroomId ? `/api/classroom/${classroomId}/me` : null);

    useEffect(() => {
        if (data?.attributes.role === 'Student') {
            router.replace(`/classroom/${classroomId}/activity`);
        }
    }, [data, router, classroomId]);

    if (!classroomId || isLoading) {
        return null;
    }

    if (typeof classroomId !== 'string' || error || !data) {
        return <NotFoundPage />;
    }

    return <PageContent classroomId={classroomId} page={page}>
        <Content classroomId={classroomId} me={data} />
    </PageContent>;
}

const PageContent: NextPage<PageContentProps> = ({ classroomId, page, children }) => {
    const router = useRouter();

    const { upload } = useNecodeFetch();

    const { data: liveActivityData, mutate: mutateLiveActivityData } = useGetRequest<{
        live: boolean,
        server: string,
        token: string,
    }>(classroomId ? `/api/classroom/${classroomId}/activity/live` : null);

    const endActivity = useCallback(() => {
        upload(`/api/classroom/${classroomId}/activity/live`, { method: 'DELETE' })
            .then(() => mutateLiveActivityData(undefined, true));
    }, [classroomId, upload, mutateLiveActivityData]);

    const goToActivity = useCallback(() => {
        router.push(`/classroom/${classroomId}/activity`);
    }, [router, classroomId]);

    const isActivityRunning = liveActivityData?.live;

    const activityRunningHeader = useMemo(() => isActivityRunning
        ? <Toolbar sx={{
            height: 64,
            backgroundColor: 'success.dark',
            justifyContent: "center"
        }}>
            <Stack direction="row" spacing={1}>
                <Typography variant="h6">
                    An activity is currently running.    
                </Typography>
                <Button color="primary" variant="contained" onClick={goToActivity}>Go To Activity</Button>
                <Button color="error" variant="contained" onClick={endActivity}>End Activity</Button>
            </Stack>
        </Toolbar>
        : undefined, [isActivityRunning, goToActivity, endActivity]);

    return <>
        {activityRunningHeader}
        <Stack sx={{
            ...{ '--header-height': isActivityRunning ? '128px' : undefined },
            height: `calc(100vh - var(--header-height))`,
            pl: 2,
            pr: 8,
            py: 4,
        }} direction="row" spacing={4}>
            <ManageClassroomSidebar page={page} classroomId={classroomId} />
            {children}
        </Stack>
    </>;
};
