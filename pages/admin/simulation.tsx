import { Alert, Button, Container } from "@mui/material";
import { DataGrid, GridColDef, GridEventListener, GridEvents, GridToolbarContainer } from "@mui/x-data-grid";
import { SitewideRights } from '@prisma/client';
import { constant } from "lodash";
import { nanoid } from 'nanoid';
import { NextPage } from "next";
import { useSnackbar } from "notistack";
import { useMemo, useState } from "react";
import { useGetRequestImmutable } from "../../src/api/client/GetRequestHook";
import { useLoadingFetch } from "../../src/api/client/LoadingFetchHook";
import { UserEntity } from "../../src/api/entities/UserEntity";
import { Response } from "../../src/api/Response";
import AdminPageAlert from "../../src/components/AdminPageAlert";
import FullPageLoader from "../../src/components/FullPageLoader";
import { useImpersonation } from '../../src/hooks/ImpersonationHook';

function SimulationToolbar(props: {
    onCreateSimulatedUser: () => void;
    createSimulatedUserDisabled: boolean;
}) {
    return <GridToolbarContainer>
        <Button variant="outlined" disabled={props.createSimulatedUserDisabled} onClick={props.onCreateSimulatedUser}>Create Simulated User</Button>
    </GridToolbarContainer>;
}

const Page: NextPage = () => {
    const { data, isLoading, mutate } = useGetRequestImmutable<UserEntity<{ simulatedUsers: 'deep' }>>('/api/me?include=simulatedUsers');

    const { upload } = useLoadingFetch();
    const { enqueueSnackbar } = useSnackbar();

    const handleCellEdited: GridEventListener<GridEvents.cellEditCommit> = async info => {
        setPerformingAction(true);

        const res: Response<UserEntity> = await upload(`/api/users/${info.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
                [info.field]: info.value
            })
        }).then(x => x.json());

        if (res.response === 'error') {
            enqueueSnackbar(`Failed to update user (${res.message})`, { variant: 'error' });
        }
        else {
            mutate();
        }

        setPerformingAction(false);
    };

    const [performingAction, setPerformingAction] = useState(false);
    async function handleCreateSimulatedUser() {
        setPerformingAction(true);

        const simulationId = nanoid();
        const res: Response<UserEntity> = await upload(`/api/users/simulated`, {
            method: 'POST',
            body: JSON.stringify({
                username: `user_${simulationId}`,
                displayName: `Simulation ${simulationId}`,
                firstName: 'Simulation',
                lastName: simulationId,
                email: `simulated-noreply-${simulationId}@necode.invalid`,
                rights: SitewideRights.None,
            })
        }).then(x => x.json());

        if (res.response === 'error') {
            enqueueSnackbar(`Failed to create simulated user (${res.message})`, { variant: 'error' });
        }
        else {
            mutate();
        }

        setPerformingAction(false);
    }

    const [hiddenCols, setHiddenCols] = useState({
        email: true,
        firstName: true,
        lastName: true
    } as { [field: string]: boolean });

    const rows = useMemo(() => data?.attributes.simulatedUsers.map(x => ({ id: x.id, ...x.attributes })) ?? [], [data]);

    const isImpersonating = Boolean(useImpersonation());

    if (isImpersonating) {
        return <Alert severity="warning" variant="filled">
            The simulation dashboard is not available while you are simulating another user.
            Please end the simulation first.
        </Alert>;
    }

    if (!data || !(data.attributes.rights === 'Admin' || data.attributes.rights === 'Faculty')) {
        return isLoading
            ? <FullPageLoader />
            : <AdminPageAlert />;
    }

    return <Container maxWidth="lg" sx={{ flexGrow: 1, display: "flex", flexDirection: "column", mb: 6 }}>
        <DataGrid
            sx={{ flexGrow: 1 }}
            loading={isLoading}
            isRowSelectable={constant(false)}
            rows={rows}
            onCellEditCommit={handleCellEdited}
            onColumnVisibilityChange={info => setHiddenCols(x => ({ ...x, [info.field]: !info.isVisible }))}
            columns={([
                { field: 'id', headerName: 'ID' },
                { field: 'username', headerName: 'Username' },
                { field: 'lastName', headerName: 'Last Name', editable: true },
                { field: 'firstName', headerName: 'First Name', editable: true },
                { field: 'displayName', headerName: 'Display Name', editable: true },
                { field: 'email', headerName: 'Email', editable: true },
                ...(data.attributes.rights === 'Admin' ? [{ field: 'rights', headerName: 'Rights', editable: true, type: 'singleSelect', valueOptions: [
                    { label: 'Admin', value: 'Admin' },
                    { label: 'Faculty', value: 'Faculty' },
                    { label: 'None', value: 'None' },
                ] }] : []),
            ] as GridColDef[]).map(x => ({ ...x, flex: 1, filterable: false, sortable: false, hide: hiddenCols[x.field] }))}
            components={{ Toolbar: SimulationToolbar }}
            componentsProps={{
                toolbar: {
                    onCreateSimulatedUser: handleCreateSimulatedUser,
                    createSimulatedUserDisabled: performingAction
                }
            }} />
    </Container>;
};

export default Page;