import { AppBar, Breadcrumbs, Button, Link, Stack, Toolbar, Typography, useScrollTrigger } from "@mui/material";
import { signIn, signOut } from "next-auth/react";
import React from "react";
import { MetaInfo } from "../contexts/MetaTransformerContext";
import NextLink, { LinkProps } from "next/link";
import { UserEntity } from "../api/entities/UserEntity";
import { useGetRequestImmutable } from "../api/client/GetRequestHook";
import { setImpersonation, useImpersonation } from '../hooks/ImpersonationHook';
import useImperativeDialog from '../hooks/ImperativeDialogHook';
import SimulationDialog from './dialogs/SimulationDialog';
import { SitewideRights } from '@prisma/client';

export default function Header(props: {
    path: MetaInfo['path']
}) {
    const shouldElevate = useScrollTrigger({
        disableHysteresis: true,
        threshold: 0
    });

    const { data: session, isLoading } = useGetRequestImmutable<UserEntity>('/api/me');

    const isImpersonating = Boolean(useImpersonation());

    function breadcrumbsLink(link: { label: string, href?: LinkProps['href'] }, index: number, isLast: boolean) {
        if (link.href) {
            return <NextLink href={link.href} passHref key={index}>
                <Link onClick={() => false}
                    variant="h6" noWrap
                    underline="hover" color={isLast ? "text.primary" : "inherit"}>{link.label}</Link>
            </NextLink>;
        }
        return <Typography
            key={index}
            variant="h6" component="div" noWrap
            color={isLast ? "text.primary" : undefined}>{link.label}</Typography>;
    }

    const [simulationDialog, openSimulationDialog] = useImperativeDialog(SimulationDialog, {});

    return <>
        <AppBar elevation={shouldElevate ? 4 : 0} position="sticky">
            <Toolbar disableGutters sx={{ px: 2 }}>
                <Breadcrumbs sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}>
                    {props.path.map((x, i) => breadcrumbsLink(x, i, i === props.path.length - 1))}
                </Breadcrumbs>
                {isLoading
                    ? undefined
                    : <Stack direction="row" justifyContent="end" alignItems="baseline" spacing={4}>
                        {session
                            ? <>
                                {isImpersonating
                                    ? <>
                                        <Typography>Simulating <strong>{session.attributes.displayName}</strong></Typography>
                                        <Button color="warning" variant="contained" onClick={() => setImpersonation(undefined)}>End Simulation</Button>
                                    </>
                                    : <>
                                        <Typography>Signed in as <strong>{session.attributes.username}</strong></Typography>
                                        {([SitewideRights.Admin, SitewideRights.Faculty] as SitewideRights[]).includes(session.attributes.rights)
                                            ? <Button color="inherit" onClick={() => openSimulationDialog()}>Simulate</Button> : null}
                                        <Button color="inherit" onClick={() => signOut({ redirect: true })}>Sign Out</Button>
                                    </>}
                            </>
                            : <Button variant="contained" onClick={() => signIn(process.env.NEXT_PUBLIC_APP_ENV === 'production' ? "wpi" : undefined, { redirect: false })}>Sign In</Button>}
                    </Stack>}
            </Toolbar>
        </AppBar>
        {simulationDialog}
    </>;
}