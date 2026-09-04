import { DeleteForever } from '@mui/icons-material';
import { Alert, Button, Container, IconButton, Stack } from "@mui/material";
import { DataGrid, GridColDef, GridRowId, GridRowSelectionModel, GridToolbarContainer, GridToolbarProps, ToolbarPropsOverrides } from "@mui/x-data-grid";
import { groupBy } from 'lodash';
import { useConfirm } from 'material-ui-confirm';
import { nanoid } from 'nanoid';
import { NextPage } from "next";
import { useSnackbar } from "notistack";
import { useState } from "react";
import { UserEntity } from "~api/entities/UserEntity";
import { SitewideRights } from '~database';
import { useGetRequestImmutable } from "~shared-ui/hooks/useGetRequest";
import { useImpersonation } from '~shared-ui/hooks/useImpersonation';
import useNecodeFetch from '~shared-ui/hooks/useNecodeFetch';
import getChangedEntityAttributes from '~shared-ui/util/getChangedEntityAttributes';
import AdminPageAlert from "~ui/components/AdminPageAlert";
import FullPageLoader from "~ui/components/FullPageLoader";
import { entityAttributeColumn } from "~ui/util/dataGridUtils";

interface SimulationToolbarProps {
    onCreateSimulatedUser: () => void;
    createSimulatedUserDisabled: boolean;
    anySelected: boolean;
    onDeleteSelectedUsers: () => void;
}

function SimulationToolbar(props: SimulationToolbarProps) {
    return <GridToolbarContainer sx={{ justifyContent: 'space-between' }}>
        <Button variant="outlined" disabled={props.createSimulatedUserDisabled} onClick={props.onCreateSimulatedUser}>Create Simulated User</Button>
        <Stack direction="row">
            <IconButton onClick={props.onDeleteSelectedUsers} disabled={!props.anySelected} color="error"><DeleteForever /></IconButton>
        </Stack>
    </GridToolbarContainer>;
}

const Page: NextPage = () => {
    const { data, isLoading, mutate } = useGetRequestImmutable<UserEntity<{ simulatedUsers: 'deep' }>>('/api/me?include=simulatedUsers', {
        revalidateOnFocus: false,
    });

    const { upload } = useNecodeFetch();
    const { enqueueSnackbar } = useSnackbar();

    async function processRowUpdate(updatedRow: UserEntity, originalRow: UserEntity): Promise<UserEntity> {
        setPerformingAction(true);

        const delta = getChangedEntityAttributes(originalRow, updatedRow);
        if (Object.keys(delta).length === 0) {
            return originalRow;
        }
        return await upload<UserEntity>(`/api/users/${originalRow.id}`, {
            method: 'PATCH',
            body: JSON.stringify(delta),
            errorMessage: err => `Failed to update user (${err.message})`,
        }).finally(() => setPerformingAction(false));
    }

    const [performingAction, setPerformingAction] = useState(false);
    async function handleCreateSimulatedUser() {
        setPerformingAction(true);

        const simulationId = nanoid();
        const res = await upload<UserEntity>(`/api/users/simulated`, {
            method: 'POST',
            body: JSON.stringify({
                username: `user_${simulationId}`,
                displayName: `Simulation ${simulationId}`,
                firstName: 'Simulation',
                lastName: simulationId,
                email: `simulated-noreply-${simulationId}@necode.invalid`,
                rights: SitewideRights.None,
            }),
            errorMessage: err => `Failed to create simulated user (${err.message})`,
        });

        mutate(data => data ? {
            ...data,
            attributes: {
                ...data.attributes,
                simulatedUsers: [...data.attributes.simulatedUsers, res],
            }
        } : undefined);

        setPerformingAction(false);
    }

    const confirm = useConfirm();

    async function handleDeleteSelectedUsers() {
        try {
            await confirm({ description: `Are you sure you want to delete ${selectedUsers.length} simulated user(s)?` });
        }
        catch (e) { return }

        const result = await Promise.allSettled(selectedUsers.map(async id => {
            await upload(`/api/users/${id}`, { method: 'DELETE', errorMessage: null });
            return id;
        }));

        const { rejected = [], fulfilled = [] } = groupBy(result, x => x.status) as {
            fulfilled: PromiseFulfilledResult<GridRowId>[],
            rejected: PromiseRejectedResult[],
        };

        if (rejected.length === 0) {
            enqueueSnackbar(`Successfully deleted ${fulfilled.length} user(s)`, {
                variant: 'success',
            });
        }
        else if (fulfilled.length === 0) {
            enqueueSnackbar(`Failed to delete ${rejected.length} user(s)`, {
                variant: 'error',
            });
        }
        else {
            enqueueSnackbar(`Failed to delete ${rejected.length} user(s) (successfully deleted ${fulfilled.length})`, {
                variant: 'error',
            });
        }

        mutate(data => data ? {
            ...data,
            attributes: {
                ...data.attributes,
                simulatedUsers: data.attributes.simulatedUsers.filter(user => fulfilled.some(x => user.id === x.value)),
            }
        } : undefined);
    }

    const [hiddenCols, setHiddenCols] = useState({
        email: true,
        firstName: true,
        lastName: true
    } as { [field: string]: boolean });

    const [selectedUsers, setSelectedUsers] = useState([] as GridRowSelectionModel);

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
            rows={data?.attributes.simulatedUsers}
            processRowUpdate={processRowUpdate}
            onColumnVisibilityModelChange={setHiddenCols}
            checkboxSelection={true}
            rowSelectionModel={selectedUsers}
            onRowSelectionModelChange={setSelectedUsers}
            columns={([
                { field: 'id', headerName: 'ID' },
                entityAttributeColumn<UserEntity>('username', { headerName: 'Username' }),
                entityAttributeColumn<UserEntity>('lastName', { headerName: 'Last Name', editable: true }),
                entityAttributeColumn<UserEntity>('firstName', { headerName: 'First Name', editable: true }),
                entityAttributeColumn<UserEntity>('displayName', { headerName: 'Display Name', editable: true }),
                entityAttributeColumn<UserEntity>('email', { headerName: 'Email', editable: true }),
                ...(data.attributes.rights === 'Admin' ? [
                    entityAttributeColumn<UserEntity>('rights', {
                        headerName: 'Rights',
                        editable: true,
                        type: 'singleSelect',
                        valueOptions: [
                            { label: 'Admin', value: 'Admin' },
                            { label: 'Faculty', value: 'Faculty' },
                            { label: 'None', value: 'None' },
                        ],
                    }),
                ] : []),
            ] as GridColDef[]).map(x => ({ ...x, flex: 1, filterable: false, sortable: false, hide: hiddenCols[x.field] }))}
            slots={{ toolbar: SimulationToolbar as any }}
            slotProps={{
                toolbar: {
                    onCreateSimulatedUser: handleCreateSimulatedUser,
                    onDeleteSelectedUsers: handleDeleteSelectedUsers,
                    createSimulatedUserDisabled: performingAction,
                    anySelected: selectedUsers.length > 0,
                } satisfies SimulationToolbarProps as Partial<GridToolbarProps & ToolbarPropsOverrides>
            }} />
    </Container>;
};

export default Page;