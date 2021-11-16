import { Link, styled } from "@mui/material";

const SubtleLink = styled(Link)(({ theme }) => `
    color: ${theme.palette.text.primary};
    text-decoration-color: ${theme.palette.text.primary};
`);

export default SubtleLink;