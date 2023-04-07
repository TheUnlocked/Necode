import { styled, Theme } from "@mui/material";
import { MUIStyledCommonProps } from "@mui/system";
import { DetailedHTMLProps, FC, HTMLAttributes } from 'react';

const Key: FC<MUIStyledCommonProps<Theme> & DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>> = styled("code")(({ theme }) => ({
    backgroundColor: theme.palette.grey[800],
    color: theme.palette.text.primary,
    padding: "0 4px",
    margin: "0 2px",
    "&:first-of-type": {
        marginLeft: 0,
    },
    "&:last-of-type": {
        marginRight: 0,
    },
    borderRadius: 4
}));

export default Key;