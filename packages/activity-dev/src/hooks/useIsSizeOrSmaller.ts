import { Breakpoint, Theme, useMediaQuery } from "@mui/material";

export default function useIsSizeOrSmaller(size: Breakpoint, theme: Theme) {
    return useMediaQuery(theme.breakpoints.down(size));
}
