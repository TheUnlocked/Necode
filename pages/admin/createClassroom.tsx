import { Skeleton, TextField, Typography } from "@mui/material";
import { NextPage } from "next";
import FormPage from "../../src/components/FormPage";
import { FormEventHandler, useCallback, useState } from "react";
import { useSnackbar } from 'notistack';
import { ClassroomEntity } from "../../src/api/entities/ClassroomEntity";
import { Response } from "../../src/api/Response";
import { useRouter } from "next/router";
import { useGetRequestImmutable } from "../../src/api/client/GetRequestHook";
import { UserEntity } from "../../src/api/entities/UserEntity";
import AdminPageAlert from "../../src/components/AdminPageAlert";
import fetch from '../../src/util/fetch';

const MIN_NAME_LENGTH = 6;
const MAX_NAME_LENGTH = 100;

const Page: NextPage = () => {
    const router = useRouter();
    const { data: me, isLoading } = useGetRequestImmutable<UserEntity>('/api/me');

    const [displayName, setDisplayName] = useState<string>();

    const { enqueueSnackbar } = useSnackbar();

    const onSubmit: FormEventHandler<HTMLFormElement> = useCallback(async e => {
        e.preventDefault();
        
        const response = await fetch('/api/classroom', {
            method: 'POST',
            body: JSON.stringify({
                displayName
            })
        });

        const data = await response.json() as Response<ClassroomEntity>;

        if (data.response === 'ok') {
            router.push(`/classroom/${data.data.id}`);
        }
        else {
            enqueueSnackbar(data.message, { variant: 'error' });
        }
    }, [displayName, enqueueSnackbar, router]);


    if (!me || !(me.attributes.rights == 'Admin' || me.attributes.rights == 'Faculty')) {
        return <FormPage title="Create Classroom" error hideSubmit>
            {isLoading
                ? <Skeleton animation="wave" variant="rectangular" height="56px" sx={{ borderRadius: 1 }} />
                : <AdminPageAlert />}
        </FormPage>;
    }

    return <FormPage
        title="Create Classroom"
        submitLabel="Create"
        formProps={{ onSubmit }} error={!displayName || displayName.length < MIN_NAME_LENGTH || displayName.length > MAX_NAME_LENGTH}>
        <TextField name="displayName" label="Display Name" variant="outlined"
            error={displayName !== undefined && (displayName.length < MIN_NAME_LENGTH || displayName.length > MAX_NAME_LENGTH)}
            helperText={
                !displayName || displayName.length < MIN_NAME_LENGTH ? `The display name must be at least ${MIN_NAME_LENGTH} characters`
                : displayName.length > MAX_NAME_LENGTH ? `The display name can be at most ${MAX_NAME_LENGTH} characters`
                : 'Looks good!'
            }
            onChange={x => setDisplayName(x.target.value)} />
    </FormPage>;
};

export default Page;