import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { useRouter } from "next/router";
import { useContext, useEffect } from "react";
import useSWR from "swr";
import { MetaTransformerContext } from "../../../src/contexts/MetaTransformerContext";
import { ResponseData as MeResponseData } from "../../api/classroom/[classroom]/me";
import { jsonFetcher } from "../../../src/util/fetch";
import { Button, Toolbar } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import testBasedActivityDescription from "../../../src/activities/html-test-based";
import canvasActivityDescription from "../../../src/activities/canvas";
import { Box } from "@mui/system";
import allLanguages from "../../../src/languages/allLanguages";

interface StaticProps {
    classroom: string;
}

const Page: NextPage<StaticProps> = ({ classroom }) => {
    const router = useRouter();
    const metaTransformer = useContext(MetaTransformerContext);

    const activity = testBasedActivityDescription;

    const supportedLanguages = allLanguages.filter(({ features }) => activity.supportedFeatures.every(f => features.includes(f)));

    useEffect(() => {
        metaTransformer({ path: [
            { label: 'To Be Named', href: '/' },
            { label: 'Class Name', href: `/classroom/${classroom}` },
            { label: 'Activity Name', href: location.href }
        ] });
    }, [metaTransformer, classroom]);

    const { data: me } = useSWR<MeResponseData>(`/api/classroom/${classroom}/me`, jsonFetcher);
    const isInstructor = me?.response === 'ok' && me.data.attributes.role === 'Instructor';

    return <>
        {isInstructor ? <Toolbar variant="dense" sx={{ minHeight: "36px", px: "16px !important" }}>
            <Button size="small" startIcon={<ArrowBack/>} onClick={() => router.push(`/classroom/${classroom}/manage`)}>
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
                activityConfig={activity.defaultConfig}
                classroom={classroom}
                language={supportedLanguages.find(x => x.name === router.query.language) ?? supportedLanguages[0]} />
        </Box>
    </>;
};

export const getStaticProps: GetStaticProps<StaticProps> = ctx => {
    if (typeof ctx.params?.classroom !== 'string') {
        return {
            notFound: true
        };
    }

    return {
        props: {
            classroom: ctx.params.classroom
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