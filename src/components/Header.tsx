import { AppBar, Breadcrumbs, Button, Link, Stack, Toolbar, Typography, useScrollTrigger } from "@mui/material";
import { signIn, signOut } from "next-auth/react";
import React from "react";
import NextLink, { LinkProps } from "next/link";
import { UserEntity } from "../api/entities/UserEntity";
import { useGetRequestImmutable } from "../api/client/GetRequestHook";
import { setImpersonation, useImpersonation } from '../hooks/ImpersonationHook';
import useImperativeDialog from '../hooks/ImperativeDialogHook';
import SimulationDialog from './dialogs/SimulationDialog';
import { SitewideRights } from '@prisma/client';
import useBreadcrumbs from '../hooks/BreadcrumbsHook';

export default function Header() {
    const shouldElevate = useScrollTrigger({
        disableHysteresis: true,
        threshold: 0
    });

    const { data: session, isLoading } = useGetRequestImmutable<UserEntity>('/api/me');

    const isImpersonating = Boolean(useImpersonation());

    const [simulationDialog, openSimulationDialog] = useImperativeDialog(SimulationDialog, {});

    return <>
        <AppBar elevation={shouldElevate ? 4 : 0} position="sticky">
            <Toolbar disableGutters sx={{ px: 2 }}>
                {useBreadcrumbs()}
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