import NextLink, { LinkProps } from "next/link";
import { Link, styled } from "@mui/material";

const MuiSubtleLink = styled(Link)(({ theme }) => `
    color: ${theme.palette.text.primary};
    text-decoration-color: ${theme.palette.text.primary};
`);

export default function SubtleLink(props: Parameters<typeof Link>[0] & { href: string }) {
    return <NextLink href={props.href} passHref>
        <MuiSubtleLink {...props}></MuiSubtleLink>
    </NextLink>;
}