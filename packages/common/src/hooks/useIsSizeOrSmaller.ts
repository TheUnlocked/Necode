import { Breakpoint, useMediaQuery, useTheme } from "@mui/material";

export default function useIsSizeOrSmaller(size: Breakpoint) {
    const theme = useTheme();
    return useMediaQuery(theme.breakpoints.down(size));
}
