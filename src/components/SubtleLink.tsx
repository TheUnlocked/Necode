import NextLink from "next/link";
import { Link, styled } from "@mui/material";
import { ForwardedRef, forwardRef } from 'react';

const MuiSubtleLink = styled(Link)(({ theme }) => `
    color: ${theme.palette.text.primary};
    text-decoration-color: ${theme.palette.text.primary};
`);

export default forwardRef(function SubtleLink(props: Parameters<typeof Link>[0] & { href: string }, ref: ForwardedRef<HTMLAnchorElement | null>) {
    return <NextLink href={props.href} passHref>
        <MuiSubtleLink {...props} ref={ref} />
    </NextLink>;
});