import { GetServerSideProps, NextPage } from "next";
import { useRouter } from "next/router";
import useSWR from 'swr';
import { ClassroomMemberEntity } from "../../../src/api/entities/ClassroomMemberEntity";
import { Response } from "../../../src/api/Response";
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
            }
        }
    }

    return {
        redirect: {
            statusCode: 302,
            destination: `/classroom/${classroomId}/activity`
        }
    }
};