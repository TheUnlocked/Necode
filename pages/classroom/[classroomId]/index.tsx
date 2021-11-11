import { NextPage } from "next";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import useSWR from 'swr';
import { ClassroomMemberEntity } from "../../../src/api/entities/ClassroomMemberEntity";
import { Response } from "../../../src/api/Response";
import { jsonFetcher } from "../../../src/util/fetch";

const Page: NextPage = () => {
    const router = useRouter();

    const { data, error } = useSWR<Response<ClassroomMemberEntity>>(`/api/classroom/${router.query.classroom}/me`, jsonFetcher);

    if (error) {
        router.replace('/404');
    }
    else if (data?.response === 'ok') {
        if (data.data.attributes.role === 'Instructor') {
            router.replace(`/classroom/${router.query.classroom}/manage`);
        }
        else {
            router.replace(`/classroom/${router.query.classroom}/activity`);
        }
    }
    return null;
};

export default Page;