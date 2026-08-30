import { Container } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { constant } from "lodash";
import { NextPage } from "next";
import { useSnackbar } from "notistack";
import { useCallback, useEffect, useState } from "react";
import { UserEntity } from "~api/entities/UserEntity";
import { Response } from "~api/Response";
import { useGetRequestImmutable } from "~shared-ui/hooks/useGetRequest";
import useLoadingFetch from "~shared-ui/hooks/useLoadingFetch";
import useNecodeFetch from "~shared-ui/hooks/useNecodeFetch";
import getChangedEntityAttributes from "~shared-ui/util/getChangedEntityAttributes";
import AdminPageAlert from "~ui/components/AdminPageAlert";
import FullPageLoader from "~ui/components/FullPageLoader";
import { entityAttributeColumn } from "~ui/util/dataGridUtils";

const Page: NextPage = () => {
    const { data: me, isLoading } = useGetRequestImmutable<UserEntity>('/api/me');

    const [pageSize, setRowsPerPage] = useState(25);

    const [rows, setRows] = useState([] as any[]);
    const [rowCount, setRowCount] = useState(0);

    const [page, setPage] = useState(0);

    const { download } = useLoadingFetch();
    const { upload } = useNecodeFetch();
    const { enqueueSnackbar } = useSnackbar();

    const [nextLink, setNextLink] = useState<string>();

    const [loading, setLoading] = useState(true);

    const handlePageChange = useCallback(async (newPage: number) => {
        setPage(newPage);
        setLoading(true);

        const data: Response<UserEntity[], { pagination: true }> = await download(
            newPage === page + 1 && nextLink !== undefined
                ? nextLink
                : `/api/users?page:index=${newPage}&page:count=${pageSize}`
        ).then(x => x.json());
        
        if (data.response === 'ok') {
            setRows(data.data);
            setRowCount(data.pagination.total);
            setNextLink(data.pagination.next);
            setLoading(false);
        }
        else {
            return enqueueSnackbar('Failed to load users', { variant: 'error' });
        }
    }, [page, pageSize, nextLink, download, enqueueSnackbar]);

    async function handleRowsPerPageChange(newSize: number) {
        setRowsPerPage(newSize);
        
        const newPage = Math.floor(page * pageSize / newSize);
        
        setNextLink(undefined);
        setPage(newPage);
        setReloadNow(true);
    }

    const [reloadNow, setReloadNow] = useState(true);

    useEffect(() => {
        if (reloadNow) {
            setReloadNow(false);
            handlePageChange(page);
        }
    }, [reloadNow, page, handlePageChange]);

    async function processRowUpdate(updatedRow: UserEntity, originalRow: UserEntity): Promise<UserEntity> {
        const delta = getChangedEntityAttributes(originalRow, updatedRow);
        if (Object.keys(delta).length === 0) {
            return originalRow;
        }
        return await upload(`/api/users/${originalRow.id}`, {
            method: 'PATCH',
            body: JSON.stringify(delta),
            errorMessage: err => `Failed to update user (${err.message})`,
        });
    };

    const [hiddenCols, setHiddenCols] = useState({
        id: true,
        displayName: true
    } as { [field: string]: boolean });

    if (!me || me.attributes.rights !== 'Admin') {
        return isLoading
            ? <FullPageLoader />
            : <AdminPageAlert />;
    }

    return <Container maxWidth="lg" sx={{ flexGrow: 1, display: "flex", flexDirection: "column", mb: 6 }}>
        <DataGrid
            sx={{ flexGrow: 1 }}
            loading={loading}
            pageSizeOptions={[10, 25, 50]}
            isRowSelectable={constant(false)}
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={model => {
                handlePageChange(model.page);
                handleRowsPerPageChange(model.pageSize);
            }}
            pagination
            paginationMode="server"
            rows={rows}
            rowCount={rowCount}
            processRowUpdate={processRowUpdate}
            onColumnVisibilityModelChange={setHiddenCols}
            columns={([
                { field: 'id', headerName: 'ID' },
                entityAttributeColumn<UserEntity>('username', { headerName: 'Username' }),
                entityAttributeColumn<UserEntity>('lastName', { headerName: 'Last Name', editable: true }),
                entityAttributeColumn<UserEntity>('firstName', { headerName: 'First Name', editable: true }),
                entityAttributeColumn<UserEntity>('displayName', { headerName: 'Display Name', editable: true }),
                entityAttributeColumn<UserEntity>('email', { headerName: 'Email' }),
                entityAttributeColumn<UserEntity>('rights', { headerName: 'Rights', editable: true, type: 'singleSelect', valueOptions: [
                    { label: 'Admin', value: 'Admin' },
                    { label: 'Faculty', value: 'Faculty' },
                    { label: 'None', value: 'None' },
                ] }),
            ] as GridColDef[]).map(x => ({ ...x, flex: 1, filterable: false, sortable: false, hide: hiddenCols[x.field] }))} />
    </Container>;
};

export default Page;