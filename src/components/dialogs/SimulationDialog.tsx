import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, List, ListItemButton } from "@mui/material";
import { Box } from '@mui/system';
import { useRouter } from 'next/router';
import { useGetRequestImmutable } from '../../api/client/GetRequestHook';
import { UserEntity } from '../../api/entities/UserEntity';
import { setImpersonation, useImpersonation } from '../../hooks/ImpersonationHook';

interface SubmissionsDialogProps {
    open: boolean;
    onClose(): void;
}

export default function SimulationDialog({
    open,
    onClose,
}: SubmissionsDialogProps) {
    const { data: session, isLoading } = useGetRequestImmutable<UserEntity<{ simulatedUsers: 'deep' }>>('/api/me?include=simulatedUsers');
    const impersonation = useImpersonation();
    const router = useRouter();

    function impersonate(userId: string | null) {
        if (userId) {
            setImpersonation(userId);
            onClose();
        }
    }

    if (isLoading || !session) {
        return <Dialog fullWidth open={open} onClose={onClose}>
            <DialogTitle>Simulation</DialogTitle>
            <DialogContent>
                <Box sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "middle",
                    height: "100%"
                }}>
                    <CircularProgress />
                </Box>
            </DialogContent>
        </Dialog>;
    }

    if (impersonation) {
        return <Dialog fullWidth open={open} onClose={onClose}>
            <DialogTitle>Simulation</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    You&apos;re already simulating a user. You must end the simulation before simulating a new user.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button color="warning" variant="contained" onClick={() => setImpersonation()}>End Simulation</Button>
            </DialogActions>
        </Dialog>;
    }

    function getUserItem(user: UserEntity) {
        return <ListItemButton key={user.id} onClick={() => impersonate(user.id)}>
            {user.attributes.displayName}
        </ListItemButton>;
    }

    return <Dialog fullWidth open={open} onClose={onClose}>
        <DialogTitle>Simulation</DialogTitle>
        {session.attributes.simulatedUsers.length > 0 ? <>
            <DialogContent>
                <DialogContentText>Select a simulated user</DialogContentText>
            </DialogContent>
            <List>
                {session.attributes.simulatedUsers.map(getUserItem)}
            </List>
            {session.attributes.rights === 'Admin' ? <>
                <DialogContent>
                    <DialogContentText>
                        As an admin, you can also impersonate real users.
                    </DialogContentText>
                </DialogContent>
        </> : null}
        </> : <DialogContent>
            <DialogContentText>You have not created any simulated users yet. Go to the simulation dashboard to create one.</DialogContentText>
            {session.attributes.rights === 'Admin' ? <>
                <DialogContentText>
                    As an admin, you can also impersonate real users.
                </DialogContentText>
        </> : null}
        </DialogContent>}
        <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            {session.attributes.rights === 'Admin'
                ? <Button color="warning" onClick={() => impersonate(prompt('Enter a user ID to impersonate'))}>Impersonate</Button>: null}
            <Button onClick={() => {
                router.push('/admin/simulation');
                onClose();
            }} variant="contained">Visit Simulation Dashboard</Button>
        </DialogActions>
    </Dialog>;
}