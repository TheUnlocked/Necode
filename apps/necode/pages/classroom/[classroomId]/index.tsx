import { NextPage } from "next";
import { useRouter } from 'next/router';
import { useGetRequest } from '~shared-ui/hooks/useGetRequest';
import { ClassroomMemberEntity } from '~api/entities/ClassroomMemberEntity';
import NotFoundPage from '../../404';

const Page: NextPage = () => {
    const router = useRouter();

    const classroomId = router.query.classroomId;

    const { data: me, error } = useGetRequest<ClassroomMemberEntity>(`/api/classroom/${classroomId}/me`);

    if (error) {
        return <NotFoundPage />;
    }

    if (me) {
        if (me.attributes.role === 'Instructor') {
            router.replace(`/classroom/${classroomId}/manage`);
        }
        else {
            router.replace(`/classroom/${classroomId}/activity`);
        }
    }
    
    return null;
};

export default Page;
