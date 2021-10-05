import { StaticDatePicker } from "@mui/lab";
import { Alert, Card, CardContent, ClickAwayListener, Divider, Grow, IconButton, Menu, MenuItem, MenuList, Paper, Popover, Popper, Select, Stack, TextField, Theme, Typography } from "@mui/material";
import { NextPage } from "next";
import { useCallback, useEffect, useRef, useState } from "react";
import { DateTime } from 'luxon';
import { Box, SxProps } from "@mui/system";
import LessonTextInput from "../../../src/components/lesson-config/LessonTextInput";
import ActivityListPane from "../../../src/components/lesson-config/ActivityListPane";


const Page: NextPage = () => {
    const [selectedDate, setSelectedDate] = useState<DateTime>(DateTime.now().startOf("day"));

    return <Stack sx={{ height: 'calc(100vh - 64px)', px: 8, pb: 8, pt: 4 }} direction="row" alignItems="center" spacing={8}>
        <Box sx={{ pt: 2 }}>
            <StaticDatePicker value={selectedDate} onChange={d => setSelectedDate(d ?? selectedDate)}
                renderInput={params => <TextField {...params} />}
                displayStaticWrapperAs="desktop"
                views={["year", "day"]} />
        </Box>
        <ActivityListPane sx={{ flexGrow: 3, height: "100%", display: "flex", flexDirection: "column" }}
            date={selectedDate} />
    </Stack>;
};

export default Page;