import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { useRouter } from "next/router";
import { useContext, useEffect } from "react";
import { MetaTransformerContext } from "../../../src/contexts/MetaTransformerContext";
import { Button, Toolbar } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import testBasedActivityDescription from "../../../src/activities/html-test-based";
import { Box } from "@mui/system";
import allLanguages from "../../../src/languages/allLanguages";
import { ClassroomMemberEntity } from "../../../src/api/entities/ClassroomMemberEntity";
import useGetRequest from "../../../src/api/client/GetRequestHook";

interface StaticProps {
    classroomId: string;
}

const Page: NextPage<StaticProps> = ({ classroomId }) => {
    const router = useRouter();
    const metaTransformer = useContext(MetaTransformerContext);

    const activity = testBasedActivityDescription;

    const supportedLanguages = allLanguages.filter(({ features }) => activity.supportedFeatures.every(f => features.includes(f)));

    useEffect(() => {
        metaTransformer({ path: [
            { label: 'To Be Named', href: '/' },
            { label: 'Class Name', href: `/classroom/${classroomId}` },
            { label: 'Activity Name', href: location.href }
        ] });
    }, [metaTransformer, classroomId]);

    const { data: me } = useGetRequest<ClassroomMemberEntity>(`/api/classroom/${classroomId}/me`);
    const isInstructor = me?.attributes.role === 'Instructor';

    return <>
        {isInstructor ? <Toolbar variant="dense" sx={{ minHeight: "36px", px: "16px !important" }}>
            <Button size="small" startIcon={<ArrowBack/>} onClick={() => router.push(`/classroom/${classroomId}/manage`)}>
                Return to Manage Classroom
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
                id={""}
                activityConfig={activity.defaultConfig}
                classroomId={classroomId}
                language={supportedLanguages.find(x => x.name === router.query.language) ?? supportedLanguages[0]} />
        </Box>
    </>;
};

export const getStaticProps: GetStaticProps<StaticProps> = ctx => {
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

export const getStaticPaths: GetStaticPaths = async () => {
    return {
        paths: [],
        fallback: true
    };
}

export default Page;