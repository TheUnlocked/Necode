import { NextPage } from "next";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useContext, useEffect } from "react";
import useSWR from "swr";
import { CanvasActivity } from "../../../src/activities/canvas/CanvasActivity";
import { MetaTransformerContext } from "../../../src/contexts/MetaTransformerContext";
import { ResponseData as MeResponseData } from "../../../pages/api/classroom/[classroom]/me";
import { jsonFetcher } from "../../../src/util/fetch";
import { Button, Toolbar } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";

const Page: NextPage = dynamic(() => Promise.resolve(() => {
    const { query } = useRouter();
    const classroom = query.classroom;
    const metaTransformer = useContext(MetaTransformerContext);

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
        <div style={{ height: `calc(100vh - 64px${isInstructor ? ' - 36px' : ''})` }}>
            <CanvasActivity classroom={query.classroom as string} />
        </div>
    </>;
}), { ssr: false });

export default Page;