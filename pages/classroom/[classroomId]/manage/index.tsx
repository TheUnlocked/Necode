import { StaticDatePicker } from "@mui/lab";
import { Stack, TextField } from "@mui/material";
import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { useState } from "react";
import { DateTime } from 'luxon';
import { Box } from "@mui/system";
import TextInputWidget from "../../../../src/components/lesson-config/TextInputWidget";
import ActivityListPane from "../../../../src/components/lesson-config/ActivityListPane";


interface StaticProps {
    classroomId: string;
}

const Page: NextPage<StaticProps> = ({ classroomId }) => {
    const [selectedDate, setSelectedDate] = useState<DateTime>(DateTime.now().startOf("day"));

    return <Stack sx={{ height: 'calc(100vh - var(--header-height))', px: 8, pb: 8, pt: 4 }} direction="row" alignItems="center" spacing={8}>
        <Box sx={{ pt: 2 }}>
            <StaticDatePicker value={selectedDate} onChange={d => setSelectedDate(d ?? selectedDate)}
                renderInput={params => <TextField {...params} />}
                displayStaticWrapperAs="desktop"
                views={["year", "day"]} />
        </Box>
        <ActivityListPane sx={{ flexGrow: 3, height: "100%", display: "flex", flexDirection: "column" }}
            classroom={classroomId}
            date={selectedDate} />
    </Stack>;
};

export default Page;

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