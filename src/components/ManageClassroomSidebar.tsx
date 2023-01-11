import { Event, Home, People } from '@mui/icons-material';
import { List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { useRouter } from 'next/router';
import { useCallback } from 'react';

export type ManageClassroomSubPageId = 'home' | 'lessons' | 'members';

export interface ManageClassroomSidebarProps {
    page: ManageClassroomSubPageId;
    classroomId?: string;
}

export default function ManageClassroomSidebar({ page, classroomId }: ManageClassroomSidebarProps) {
    const router = useRouter();

    const clickHandler = useCallback((targetPage: string) => {
        if (page !== targetPage) {
            switch (targetPage) {
                case 'home':
                    router.push(`/classroom/${classroomId}/manage`);
                    break;
                case 'lessons':
                    router.push(`/classroom/${classroomId}/manage/lessons`);
                    break;
                case 'members':
                    router.push(`/classroom/${classroomId}/manage/members`);
                    break;
            }
        }
    }, [router, classroomId, page]);

    function item(
        id: ManageClassroomSubPageId,
        icon: React.ReactNode,
        label: string,
    ) {
        const selected = id === page;
    
        // Click ripple doesn't work for some reason. Probably something to do with how Next handles soft navigation.
        return <ListItemButton disableTouchRipple selected={selected} sx={{ borderRadius: 100, my: 1 }} onClick={() => clickHandler(id)}>
            <ListItemIcon>{icon}</ListItemIcon>
            <ListItemText>{label}</ListItemText>
        </ListItemButton>;
    }

    return <List>
        {item('home', <Home />, "Home")}
        {item('lessons', <Event />, "Lessons")}
        {item('members', <People />, "Members")}
    </List>;
}