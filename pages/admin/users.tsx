import { Container } from "@mui/material";
import { DataGrid, GridColDef, GridEventListener, GridEvents } from "@mui/x-data-grid";
import { constant } from "lodash";
import { NextPage } from "next";
import { useSnackbar } from "notistack";
import { useCallback, useEffect, useState } from "react";
import { useGetRequestImmutable } from "../../src/api/client/GetRequestHook";
import { useLoadingFetch } from "../../src/api/client/LoadingFetchHook";
import { UserEntity } from "../../src/api/entities/UserEntity";
import { Response } from "../../src/api/Response";
import AdminPageAlert from "../../src/components/AdminPageAlert";
import FullPageLoader from "../../src/components/FullPageLoader";

const Page: NextPage = () => {
    const { data: me, isLoading } = useGetRequestImmutable<UserEntity>('/api/me');

    const [rowsPerPage, setRowsPerPage] = useState(25);

    const [rows, setRows] = useState([] as any[]);
    const [rowCount, setRowCount] = useState(0);

    const [page, setPage] = useState(0);

    const { download, upload } = useLoadingFetch();
    const { enqueueSnackbar } = useSnackbar();

    const [nextLink, setNextLink] = useState<string>();

    const [loading, setLoading] = useState(true);

    const handlePageChange = useCallback(async (newPage: number) => {
        setPage(newPage);
        setLoading(true);

        const data: Response<UserEntity[], { pagination: true }> = await download(
            newPage === page + 1 && nextLink !== undefined
                ? nextLink
                : `/api/users?page:index=${newPage}&page:count=${rowsPerPage}`
        ).then(x => x.json());
        
        if (data.response === 'ok') {
            setRows(data.data.map(x => ({ id: x.id, ...x.attributes })));
            setRowCount(data.pagination.total);
            setNextLink(data.pagination.next);
            setLoading(false);
        }
        else {
            return enqueueSnackbar('Failed to load users', { variant: 'error' });
        }
    }, [page, rowsPerPage, nextLink, download, enqueueSnackbar]);

    async function handleRowsPerPageChange(newSize: number) {
        setRowsPerPage(newSize);
        
        const newPage = Math.floor(page * rowsPerPage / newSize);
        
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

    const handleCellEdited: GridEventListener<GridEvents.cellEditCommit> = async info => {
        const res: Response<UserEntity> = await upload(`/api/users/${info.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
                [info.field]: info.value
            })
        }).then(x => x.json());

        if (res.response === 'error') {
            enqueueSnackbar(`Failed to update user (${res.message})`, { variant: 'error' });
        }
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
            rowsPerPageOptions={[10, 25, 50]}
            isRowSelectable={constant(false)}
            pageSize={rowsPerPage}
            onPageSizeChange={handleRowsPerPageChange}
            pagination
            paginationMode="server"
            rows={rows}
            rowCount={rowCount}
            page={page}
            onPageChange={handlePageChange}
            onCellEditCommit={handleCellEdited}
            onColumnVisibilityChange={info => setHiddenCols(x => ({ ...x, [info.field]: !info.isVisible }))}
            columns={([
                { field: 'id', headerName: 'ID' },
                { field: 'username', headerName: 'Username' },
                { field: 'lastName', headerName: 'Last Name', editable: true },
                { field: 'firstName', headerName: 'First Name', editable: true },
                { field: 'displayName', headerName: 'Display Name', editable: true },
                { field: 'email', headerName: 'Email' },
                { field: 'rights', headerName: 'Rights', editable: true, type: 'singleSelect', valueOptions: [
                    { label: 'Admin', value: 'Admin' },
                    { label: 'Faculty', value: 'Faculty' },
                    { label: 'None', value: 'None' },
                ] },
            ] as GridColDef[]).map(x => ({ ...x, flex: 1, filterable: false, sortable: false, hide: hiddenCols[x.field] }))} />
    </Container>;
};

export default Page;