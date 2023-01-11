import { Container } from "@mui/material";
import { DataGrid, GridColDef, GridEventListener, GridEvents } from "@mui/x-data-grid";
import { constant } from "lodash";
import { NextPage } from "next";
import { useSnackbar } from "notistack";
import { useEffect, useState, useMemo } from "react";
import { useGetRequest } from '../../../../src/api/client/GetRequestHook';
import { ClassroomMemberEntity } from '../../../../src/api/entities/ClassroomMemberEntity';
import ManageClassroomPage, { ManageClassroomPageContentProps } from '../../../../src/components/layouts/ManageClassroomPage';
import useNecodeFetch from '../../../../src/hooks/useNecodeFetch';

const Page: NextPage = () => {
    return <ManageClassroomPage page="members" component={PageContent} />;
};


const PageContent: NextPage<ManageClassroomPageContentProps> = ({ classroomId, me }) => {

    const { upload } = useNecodeFetch();

    const { data, isLoading, error } = useGetRequest<ClassroomMemberEntity[]>(`/api/classroom/${classroomId}/members`);

    const rows = useMemo(() => data?.map(u => ({ id: u.id, ...u.attributes })) ?? [], [data]);

    const handleCellEdited: GridEventListener<GridEvents.cellEditCommit> = info => {
        upload<ClassroomMemberEntity>(`/api/classroom/${classroomId}/members/${info.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
                [info.field]: info.value
            }),
            errorMessage(err) {
                return `Failed to update user (${err.message})`;
            }
        });
    };

    const { enqueueSnackbar } = useSnackbar();

    useEffect(() => {
        if (error) {
            enqueueSnackbar(error, { variant: 'error' });
        }
    }, [error, enqueueSnackbar]);

    const [hiddenCols, setHiddenCols] = useState({
        id: true,
        email: true,
        firstName: true,
        lastName: true,
    } as { [field: string]: boolean });

    return <Container maxWidth="lg" sx={{ flexGrow: 1, display: "flex", flexDirection: "column", mb: 6 }}>
        <DataGrid
            sx={{ flexGrow: 1 }}
            rowsPerPageOptions={[10, 25, 50]}
            isRowSelectable={constant(false)}
            pagination
            paginationMode="client"
            rows={rows}
            loading={isLoading}
            onCellEditCommit={handleCellEdited}
            onColumnVisibilityChange={info => setHiddenCols(x => ({ ...x, [info.field]: !info.isVisible }))}
            columns={([
                { field: 'id', headerName: 'ID' },
                { field: 'username', headerName: 'Username' },
                { field: 'lastName', headerName: 'Last Name' },
                { field: 'firstName', headerName: 'First Name' },
                { field: 'displayName', headerName: 'Display Name' },
                { field: 'email', headerName: 'Email' },
                {
                    field: 'role', headerName: 'Role', editable: true, type: 'singleSelect', valueOptions: [
                        { label: 'Instructor', value: 'Instructor' },
                        { label: 'Student', value: 'Student' },
                    ]
                },
            ] as GridColDef[]).map(x => ({ ...x, flex: 1, filterable: false, sortable: false, hide: hiddenCols[x.field] }))} />
    </Container>;
};

export default Page;