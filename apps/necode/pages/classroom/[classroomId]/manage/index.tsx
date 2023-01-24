import { Stack } from "@mui/material";
import { NextPage } from "next";
import ActivityListPane from "common/components/lesson-config/ActivityListPane";
import { fromLuxon } from "common/util/iso8601";
import { DateTime } from "luxon";
import JoinCodeCard from 'common/components/lesson-config/JoinCodeCard';
import ManageClassroomPage, { ManageClassroomPageContentProps } from 'common/components/layouts/ManageClassroomPage';


const Page: NextPage = () => {
    return <ManageClassroomPage page="home" component={PageContent} />;
};

const PageContent: NextPage<ManageClassroomPageContentProps> = ({ classroomId }) => {

    // Normally fromLuxon uses UTC, but for the default we want "today" in the user's timezone
    const today = fromLuxon(DateTime.now(), false);

    return <>
        <Stack spacing={4} p={2} minWidth={300} alignItems="center">
            {/* Cards */}
            <JoinCodeCard classroomId={classroomId} />
        </Stack>
        <ActivityListPane sx={{ flexGrow: 3, height: "100%", display: "flex", flexDirection: "column" }}
            classroomId={classroomId!}
            date={today} forTodayOnly />
    </>;
};

export default Page;
