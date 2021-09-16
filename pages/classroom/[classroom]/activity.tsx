import { NextPage } from "next";
import { useRouter } from "next/router";
import { useContext, useEffect } from "react";
import { CanvasActivity } from "../../../src/activities/canvas/CanvasActivity";
import { MetaTransformerContext } from "../../../src/contexts/MetaTransformerContext";

const Page: NextPage = () => {
    const { query } = useRouter();
    const metaTransformer = useContext(MetaTransformerContext);

    useEffect(() => {
        metaTransformer({ path: [
            { label: 'To Be Named', href: '/' },
            { label: 'Class Name', href: `/classroom/${query.classroom}` },
            { label: 'Activity Name', href: location.href }
        ] });
    }, [metaTransformer, query]);

    return <div style={{height: 'calc(100vh - 64px)'}}><CanvasActivity/></div>;
};

export default Page;