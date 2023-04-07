import { Box, Card, Stack } from '@mui/material';
import { PropsWithChildren } from 'react';
import PaneTitle from './PaneTitle';

export interface BasePaneProps {
    hidden?: boolean;
    minHeight?: number;
    maxHeight?: number;
    minWidth?: number;
    maxWidth?: number;
}

export interface PaneProps extends PropsWithChildren<BasePaneProps> {
    icon?: JSX.Element;
    label: string | JSX.Element;
    toolbar?: JSX.Element;
    /**
     * Should the toolbar stretch to the edges of the pane?
     * @default false
     */
    bleedToolbar?: boolean;
}

export default function Pane({ icon, label, toolbar, bleedToolbar, children }: PaneProps) {
    return <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <Stack direction="column" sx={{ height: "100%" }}>
            <Stack direction="row">
                <Stack direction="row" alignItems="center" sx={{ m: 1, flexGrow: 1, height: "24px" }}>
                    {icon}
                    <PaneTitle sx={{ ml: 1 }}>{label}</PaneTitle>
                </Stack>
                {toolbar
                    ? <Stack direction="row" alignItems="center"
                        sx={{ height: bleedToolbar ? "40px" : "24px", m: bleedToolbar ? 0 : 1 }}
                    >
                        {toolbar}
                    </Stack>
                    : undefined}
            </Stack>
            <Box sx={{
                flexGrow: 1,
                height: "calc(100% - 40px)", // need this because some children may depend on height
            }}>
                {children}
            </Box>
        </Stack>
    </Card>;
}