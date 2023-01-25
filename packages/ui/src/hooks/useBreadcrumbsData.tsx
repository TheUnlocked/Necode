import { ErrorOutline } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import { useRouter } from 'next/router';
import { ReactNode } from 'react';
import { useGetRequestImmutable } from './useGetRequest';
import { ActivityEntity } from '~api/entities/ActivityEntity';
import { ClassroomMemberEntity } from '~api/entities/ClassroomMemberEntity';

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
            return <ErrorOutline color="error" sx={{ display: "block" }} />;
    }
}

export default function useBreadcrumbsData(): BreadcrumbData[] {
    const router = useRouter();
    const crumbs: BreadcrumbData[] = [
        { href: '/', label: 'Necode' },
    ];
    const pathFragments = router.pathname.split('/').slice(1);

    const classroomId = router.query.classroomId;
    const activityId = router.query.activityId;

    const { data: classroomMemberData, error: classroomError, isLoading: classroomLoading } = useGetRequestImmutable<ClassroomMemberEntity<{ classroom: 'deep' }>>(
        classroomId ? `/~api/classroom/${classroomId}/me?include=classroom` : null
    );

    const { data: activityData, error: activityError, isLoading: activityLoading } = useGetRequestImmutable<ActivityEntity<{ lesson: 'deep' }>>(
        activityId && classroomMemberData ? `/~api/classroom/${classroomId}/activity/${activityId}${classroomMemberData.attributes.role === 'Instructor' ? '?include=lesson' : ''}` : null
    );

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
                        label: <AsyncBreadcrumb label={classroomMemberData?.attributes.classroom.attributes.displayName} status={classroomLoading ? 'loading' : classroomError ? 'error' : 'done'} />,
                        title: classroomMemberData?.attributes.classroom.attributes.displayName
                    });
                    switch (pathFragments[2]) {
                        case 'manage':
                            crumbs.push({ href: `/classroom/${classroomId}/manage`, label: 'Manage' });
                            switch (pathFragments[3]) {
                                case 'activity':
                                    if (pathFragments[4] === '[activityId]') {
                                        const lessonName = activityData?.attributes.lesson.attributes.displayName || activityData?.attributes.lesson.attributes.date;
                                        crumbs.push({
                                            href: `/classroom/${classroomId}/manage#${activityData?.attributes.lesson.attributes.date}`,
                                            label: <AsyncBreadcrumb label={lessonName} status={activityLoading ? 'loading' : activityError ? 'error' : 'done'} />,
                                            title: lessonName
                                        });
                                        crumbs.push({
                                            href: `/classroom/${classroomId}/manage/activity/${activityId}`,
                                            label: <AsyncBreadcrumb label={activityData?.attributes.displayName} status={activityLoading ? 'loading' : activityError ? 'error' : 'done'} />,
                                            title: activityData?.attributes.displayName
                                        });
                                    }
                                    break;
                                case 'lessons':
                                    crumbs.push({ href: `/classroom/${classroomId}/manage/lessons`, label: 'Lessons' });
                                    break;
                                case 'members':
                                    crumbs.push({ href: `/classroom/${classroomId}/manage/members`, label: 'Members' });
                                    break;
                            }
                            break;
                        case 'activity':
                            crumbs.push({
                                href: `/classroom/${classroomId}/activity`,
                                label: 'Activity',
                            });
                            break;
                    }
                    break;
            }
            break;
    }

    return crumbs;
}
