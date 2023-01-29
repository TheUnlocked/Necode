import { AppBar, Breadcrumbs, Button, Stack, Toolbar, Typography, useScrollTrigger } from "@mui/material";
import { signIn, signOut } from "next-auth/react";
import { UserEntity } from "~api/entities/UserEntity";
import { useGetRequestImmutable } from "../hooks/useGetRequest";
import { setImpersonation, useImpersonation } from '../hooks/useImpersonation';
import useImperativeDialog from '~shared-ui/hooks/useImperativeDialog';
import SimulationDialog from './dialogs/SimulationDialog';
import { SitewideRights } from '~database';
import useBreadcrumbsData from '../hooks/useBreadcrumbsData';
import { UnstyledLink } from '~shared-ui/components/SubtleLink';

function NecodeBreadcrumbs() {
    const info = useBreadcrumbsData();

    return <Breadcrumbs sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}>
        {info.map((crumb, i) => <UnstyledLink href={crumb.href} key={crumb.href}
                    variant="h6" noWrap
                    underline="hover" color={i === info.length - 1 ? "text.primary" : "inherit"}>{crumb.label}</UnstyledLink>)}
    </Breadcrumbs>;
}

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
                <NecodeBreadcrumbs />
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