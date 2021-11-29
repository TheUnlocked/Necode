import { AppBar, Breadcrumbs, Button, Link, Stack, Toolbar, Typography, useScrollTrigger } from "@mui/material";
import { signIn, signOut } from "next-auth/react";
import React from "react";
import { MetaInfo } from "../contexts/MetaTransformerContext";
import NextLink, { LinkProps } from "next/link";
import { UserEntity } from "../api/entities/UserEntity";
import { useGetRequestImmutable } from "../api/client/GetRequestHook";

export default function Header(props: {
    path: MetaInfo['path']
}) {
    const shouldElevate = useScrollTrigger({
        disableHysteresis: true,
        threshold: 0
    });

    const { data: session, isLoading } = useGetRequestImmutable<UserEntity>('/api/me');

    function breadcrumbsLink(link: { label: string, href?: LinkProps['href'] }, index: number, isLast: boolean) {
        if (link.href) {
            return <NextLink href={link.href} key={index}>
                <Link href={link.href.toString()} onClick={() => false}
                    variant="h6" noWrap
                    underline="hover" color={isLast ? "text.primary" : "inherit"}>{link.label}</Link>
            </NextLink>;
        }
        return <Typography
            key={index}
            variant="h6" component="div" noWrap
            color={isLast ? "text.primary" : undefined}>{link.label}</Typography>;
    }

    return <AppBar elevation={shouldElevate ? 4 : 0} position="sticky">
        <Toolbar disableGutters sx={{ px: 2 }}>
            <Breadcrumbs sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}>
                {props.path.map((x, i) => breadcrumbsLink(x, i, i === props.path.length - 1))}
            </Breadcrumbs>
            {isLoading
                ? undefined
                : <Stack direction="row" justifyContent="end" alignItems="baseline" spacing={4}>
                    {session
                        ? <>
                            <Typography>Signed in as <strong>{session.attributes.username}</strong></Typography>
                            <Button color="inherit" onClick={() => signOut({ redirect: true })}>Sign Out</Button>
                        </>
                        : <Button variant="contained" onClick={() => signIn("wpi", { redirect: false })}>Sign In</Button>}
                </Stack>}
        </Toolbar>
    </AppBar>;
}