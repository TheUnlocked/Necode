import { styled } from "@mui/material";

const Key = styled("code")(({ theme }) => ({
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