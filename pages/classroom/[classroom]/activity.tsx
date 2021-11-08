import { NextPage } from "next";
import dynamic from "next/dynamic";
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

const Page: NextPage = dynamic(() => Promise.resolve(() => {
    const { query } = useRouter();
    const classroom = query.classroom;
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
            <Button size="small" startIcon={<ArrowBack/>}>Return to Manage Classroom</Button>
        </Toolbar> : null}
        <Box sx={{
            px: 2,
            pb: 2,
            height: `calc(100vh - 64px${isInstructor ? ' - 36px' : ''})`,
            "& .reflex-container > .reflex-element": {
                overflow: "hidden"
            }
        }}>
            <activity.activityPage
                activityConfig={activity.defaultConfig}
                classroom={query.classroom as string}
                language={supportedLanguages.find(x => x.name === query.language) ?? supportedLanguages[0]} />
        </Box>
    </>;
}), { ssr: false });

export default Page;