import { ErrorOutline } from '@mui/icons-material';
import { Breadcrumbs, CircularProgress, Link } from '@mui/material';
import NextLink from "next/link";
import { useRouter } from 'next/router';
import { ReactNode } from 'react';
import { useGetRequestImmutable } from '../api/client/GetRequestHook';
import { ActivityEntity } from '../api/entities/ActivityEntity';
import { ClassroomEntity } from '../api/entities/ClassroomEntity';

export type BreadcrumbData = {
    href: string;
    title?: string;
    label: string;
} | {
    href: string;
    title: string | undefined;
    label: ReactNode;
};

function AsyncBreadcrumb({ label, status }: { label?: string, status: 'done' | 'loading' | 'error' }) {
    switch (status) {
        case 'done':
            return <>{label}</>;
        case 'loading':
            return <CircularProgress size={16} />;
        case 'error':
            return <ErrorOutline color="error" />
    }
}

export function useBreadcrumbsData(): BreadcrumbData[] {
    const router = useRouter();
    const crumbs: BreadcrumbData[] = [
        { href: '/', label: 'Necode' },
    ];
    const pathFragments = router.pathname.split('/').slice(1);

    const classroomId = router.query.classroomId;
    const activityId = router.query.activityId;

    const { data: classroomData, error: classroomError, isLoading: classroomLoading } = useGetRequestImmutable<ClassroomEntity>(classroomId ? `/api/classroom/${classroomId}` : null);
    const { data: activityData, error: activityError, isLoading: activityLoading } = useGetRequestImmutable<ActivityEntity>(activityId ? `/api/classroom/${classroomId}/activity/${activityId}` : null);

    switch (pathFragments[0]) {
        case 'admin':
            crumbs.push({ href: '/admin/', label: 'Admin' });
            switch (pathFragments[1]) {
                case 'createClassroom':
                    crumbs.push({ href: '/admin/createClassroom', label: 'Create Classroom' });
                    break;
                case 'simulation':
                    crumbs.push({ href: '/admin/simulation', label: 'Simulation Management' });
                    break;
                case 'users':
                    crumbs.push({ href: '/admin/users', label: 'User Management' });
                    break;
            }
            break;
        case 'classroom':
            switch (pathFragments[1]) {
                case 'join':
                    crumbs.push({ href: '/classroom/join', label: 'Join Classroom' });
                    break;
                case '[classroomId]':
                    crumbs.push({
                        href: `/classroom/${classroomId}`,
                        label: <AsyncBreadcrumb label={classroomData?.attributes.displayName} status={classroomLoading ? 'loading' : classroomError ? 'error' : 'done'} />,
                        title: classroomData?.attributes.displayName
                    });
                    if (pathFragments[2] === 'manage') {
                        crumbs.push({ href: `/classroom/${classroomId}/manage`, label: 'Manage' });
                        if (pathFragments[3] === 'activity' && pathFragments[4] === '[activityId]') {
                            crumbs.push({
                                href: `/classroom/${classroomId}/manage/activity/${activityId}`,
                                label: <AsyncBreadcrumb label={activityData?.attributes.activityType} status={activityLoading ? 'loading' : activityError ? 'error' : 'done'} />,
                                title: activityData?.attributes.activityType
                            });
                        }
                    }
                    break;
            }
            break;
    }

    return crumbs;
}

export default function useBreadcrumbs() {
    const info = useBreadcrumbsData();

    return <Breadcrumbs sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}>
        {info.map((crumb, i) => <NextLink href={crumb.href} passHref key={i}>
                <Link onClick={() => false}
                    variant="h6" noWrap
                    underline="hover" color={i === info.length - 1 ? "text.primary" : "inherit"}>{crumb.label}</Link>
            </NextLink>)}
    </Breadcrumbs>;
}
