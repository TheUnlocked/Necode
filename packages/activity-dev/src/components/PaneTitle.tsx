import { SxProps, Theme, TypeText, Typography } from '@mui/material';
import { PropsWithChildren } from 'react';

export interface PaneTitleProps extends PropsWithChildren {
    /** @default undefined */
    color?: keyof TypeText;
    /** @default true */
    selectable?: boolean;

    sx?: SxProps<Theme>;
}

export default function PaneTitle({ color, selectable = true, children, sx }: PaneTitleProps) {
    return <Typography variant="overline" sx={{
        userSelect: selectable ? undefined : "none",
        color: ({ palette }) => palette.text[color!],
        ...sx,
    }}>
        {children}
    </Typography>;
}