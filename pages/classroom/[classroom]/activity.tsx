import { NextPage } from "next";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useContext, useEffect } from "react";
import useSWR from "swr";
import { MetaTransformerContext } from "../../../src/contexts/MetaTransformerContext";
import { ResponseData as MeResponseData } from "../../../pages/api/classroom/[classroom]/me";
import { jsonFetcher } from "../../../src/util/fetch";
import { Button, Toolbar } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import testBasedActivityDescription from "../../../src/activities/test-based";
import canvasActivityDescription from "../../../src/activities/canvas";
import { Box } from "@mui/system";
import { TestActivityConfig } from "../../../src/activities/test-based/TestActivity";
import allLanguages from "../../../src/languages/allLanguages";
import dedent from "dedent-js";

const Page: NextPage = dynamic(() => Promise.resolve(() => {
    const { query } = useRouter();
    const classroom = query.classroom;
    const metaTransformer = useContext(MetaTransformerContext);

    const {
        supportedFeatures: activitySupportedFeatures,
        activityPage: ActivityPage
    } = canvasActivityDescription;
    // } = testBasedActivityDescription;

    const activitySupportedLanguages = allLanguages.filter(({ features }) => activitySupportedFeatures.every(f => features.includes(f)));

    const activityConfig: TestActivityConfig = {
        description: dedent`
        # Problem
        Info about problem
        \`\`\`js
        function someCode() {
            return true;
        }
        \`\`\`
        ## Subproblem
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec laoreet maximus mauris at rhoncus.
        Donec in lacus id tortor fermentum finibus. Nulla leo arcu, porttitor in justo nec, gravida varius mauris.
        Donec commodo at sapien eu dictum. Quisque arcu nisi, consequat vel turpis luctus, imperdiet cursus diam.
        Morbi ultrices at arcu quis efficitur. Integer ut vestibulum mi. Donec nec porta ante.
        * [ ] Task 1
        * [x] ~~Task 2~~
        * [ ] Task 3
        `,
        html: { enabled: true, defaultValue: '' },
        code: { enabled: true, defaultValue: {} },
        css: { enabled: true, defaultValue: '' },
    };

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
            <ActivityPage
                activityConfig={activityConfig}
                classroom={query.classroom as string}
                language={activitySupportedLanguages.find(x => x.name === query.language) ?? activitySupportedLanguages[0]} />
        </Box>
    </>;
}), { ssr: false });

export default Page;