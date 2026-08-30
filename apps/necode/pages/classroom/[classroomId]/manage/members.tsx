import { GroupRemove } from '@mui/icons-material';
import { Container, IconButton, Stack, Tooltip } from "@mui/material";
import { DataGrid, GridColDef, GridEventListener, GridRowId, GridRowSelectionModel, GridToolbarContainer, GridToolbarProps, ToolbarPropsOverrides } from "@mui/x-data-grid";
import { groupBy } from "lodash";
import { useConfirm } from 'material-ui-confirm';
import { NextPage } from "next";
import { useSnackbar } from "notistack";
import { useEffect, useState, useMemo } from "react";
import { useGetRequest } from '~shared-ui/hooks/useGetRequest';
import { ClassroomMemberEntity } from '~api/entities/ClassroomMemberEntity';
import ManageClassroomPage, { ManageClassroomPageContentProps } from '~ui/components/layouts/ManageClassroomPage';
import useNecodeFetch from '~shared-ui/hooks/useNecodeFetch';
import { entityAttributeColumn } from '~ui/util/dataGridUtils';
import { UserEntity } from '~api/entities/UserEntity';
import getChangedEntityAttributes from '~shared-ui/util/getChangedEntityAttributes';

const Page: NextPage = () => {
    return <ManageClassroomPage page="members" component={PageContent} />;
};

interface ToolbarProps {
    anySelected: boolean;
    onRemoveSelectedMembers: () => void;
}

function Toolbar(props: ToolbarProps) {
    return <GridToolbarContainer sx={{ justifyContent: 'end' }}>
        <Stack direction="row">
            <Tooltip title="Remove selected users from the classroom">
                <IconButton onClick={props.onRemoveSelectedMembers} disabled={!props.anySelected} color="error"><GroupRemove /></IconButton>
            </Tooltip>
        </Stack>
    </GridToolbarContainer>;
}

const PageContent: NextPage<ManageClassroomPageContentProps> = ({ classroomId, me }) => {

    const { upload } = useNecodeFetch();

    const { data, isLoading, error, mutate } = useGetRequest<ClassroomMemberEntity[]>(`/api/classroom/${classroomId}/members`);

    const { enqueueSnackbar } = useSnackbar();
    const confirm = useConfirm();

    useEffect(() => {
        if (error) {
            enqueueSnackbar(error, { variant: 'error' });
        }
    }, [error, enqueueSnackbar]);

    const [selectedMembers, setSelectedMembers] = useState([] as GridRowSelectionModel);

    async function handleRemoveSelectedMembers() {
        if (selectedMembers.includes(me.id)) {
            enqueueSnackbar('You cannot remove yourself from a classroom. Deselect yourself and try again.', { variant: 'error' });
            return;
        }

        try {
            await confirm({ description: <>
                Are you sure you want to remove {selectedMembers.length} {selectedMembers.length === 1 ? 'person' : 'people'} from the classroom?
                They will not be able to participate in class activities unless they re-join the classroom.
                <br />
                Note: Unless you have reset the join code, they may be able to re-join the class on their own using the code/link originally sent to them.
            </> });
        }
        catch (e) { return }

        const result = await Promise.allSettled(selectedMembers.map(async id => {
            await upload(`/api/classroom/${classroomId}/members/${id}`, { method: 'DELETE', errorMessage: null });
            return id;
        }));

        const { rejected = [], fulfilled = [] } = groupBy(result, x => x.status) as {
            fulfilled: PromiseFulfilledResult<GridRowId>[],
            rejected: PromiseRejectedResult[],
        };

        if (rejected.length === 0) {
            enqueueSnackbar(`Successfully removed ${fulfilled.length} members(s)`, {
                variant: 'success',
            });
        }
        else if (fulfilled.length === 0) {
            enqueueSnackbar(`Failed to remove ${rejected.length} members(s)`, {
                variant: 'error',
            });
        }
        else {
            enqueueSnackbar(`Failed to remove ${rejected.length} members(s) (successfully removed ${fulfilled.length})`, {
                variant: 'error',
            });
        }

        mutate(data => data?.filter(member => fulfilled.some(x => x.value === member.id)));
        setSelectedMembers(ids => ids.filter(id => fulfilled.some(x => x.value === id)));
    }

    async function processRowUpdate(updatedRow: ClassroomMemberEntity, originalRow: ClassroomMemberEntity): Promise<ClassroomMemberEntity> {
        if (originalRow.id === me.id && updatedRow.attributes.role !== originalRow.attributes.role) {
            enqueueSnackbar('You cannot change your own role', { variant: 'error' });
            return originalRow;
        }

        return await upload<ClassroomMemberEntity>(`/api/classroom/${classroomId}/members/${originalRow.id}`, {
            method: 'PATCH',
            body: JSON.stringify(JSON.stringify(getChangedEntityAttributes(originalRow, updatedRow))),
            errorMessage(err) {
                return `Failed to update user (${err.message})`;
            }
        });
    };

    const [hiddenCols, setHiddenCols] = useState({
        id: true,
        email: true,
        firstName: true,
        lastName: true,
    } as { [field: string]: boolean });

    return <Container maxWidth="lg" sx={{ flexGrow: 1, display: "flex", flexDirection: "column", mb: 6 }}>
        <DataGrid
            sx={{ flexGrow: 1 }}
            pageSizeOptions={[10, 25, 50]}
            checkboxSelection={true}
            rowSelectionModel={selectedMembers}
            onRowSelectionModelChange={setSelectedMembers}
            pagination
            paginationMode="client"
            rows={data}
            loading={isLoading}
            processRowUpdate={processRowUpdate}
            onColumnVisibilityModelChange={setHiddenCols}
            columns={([
                { field: 'id', headerName: 'ID' },
                entityAttributeColumn<ClassroomMemberEntity>('username', { headerName: 'Username' }),
                entityAttributeColumn<ClassroomMemberEntity>('lastName', { headerName: 'Last Name' }),
                entityAttributeColumn<ClassroomMemberEntity>('firstName', { headerName: 'First Name' }),
                entityAttributeColumn<ClassroomMemberEntity>('displayName', { headerName: 'Display Name' }),
                entityAttributeColumn<ClassroomMemberEntity>('email', { headerName: 'Email' }),
                entityAttributeColumn<ClassroomMemberEntity>('role', { headerName: 'Role', editable: true, type: 'singleSelect', valueOptions: [
                        { label: 'Instructor', value: 'Instructor' },
                        { label: 'Student', value: 'Student' },
                    ]
                }),
            ] as GridColDef[]).map(x => ({ ...x, flex: 1, filterable: false, sortable: false, hide: hiddenCols[x.field] }))}
            slots={{ toolbar: Toolbar as any }}
            slotProps={{
                toolbar: {
                    onRemoveSelectedMembers: handleRemoveSelectedMembers,
                    anySelected: selectedMembers.length > 0,
                } satisfies ToolbarProps as Partial<GridToolbarProps & ToolbarPropsOverrides>
            }} />
    </Container>;
};

export default Page;