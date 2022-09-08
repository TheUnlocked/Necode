import { GetServerSideProps, NextPage } from "next";
import apiClassroomMe from "../../api/classroom/[classroomId]/me";

const Page: NextPage = () => {
    return null;
};

export default Page;

export const getServerSideProps: GetServerSideProps = async ({ query: { classroomId }, req }) => {
    if (typeof classroomId === 'string') {
        const { data } = await apiClassroomMe.GET.execute(req, { query: { classroomId, include: [] } });

        if (data?.attributes.role === 'Instructor') {
            return {
                redirect: {
                    statusCode: 302,
                    destination: `/classroom/${classroomId}/manage`
                }
            };
        }
    }

    return {
        redirect: {
            statusCode: 302,
            destination: `/classroom/${classroomId}/activity`
        }
    };
};