import { TextField } from "@mui/material";
import { NextPage } from "next";
import FormPage from "../../src/components/FormPage";
import DevPageWarning from "../../src/components/DevPageWarning";
import { FormEventHandler, useCallback, useState } from "react";
import { useSnackbar } from 'notistack';
import { ClassroomEntity } from "../../src/api/entities/ClassroomEntity";
import { Response } from "../../src/api/Response";
import { useRouter } from "next/router";

const Page: NextPage = () => {
    const [name, setName] = useState("");
    const [displayName, setDisplayName] = useState("");

    const router = useRouter();

    const { enqueueSnackbar } = useSnackbar();

    const onSubmit: FormEventHandler<HTMLFormElement> = useCallback(async e => {
        e.preventDefault();
        
        const response = await fetch('/api/classroom', {
            method: 'POST',
            body: JSON.stringify({
                name,
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
    }, [name, displayName, enqueueSnackbar, router]);

    return <FormPage
        title="Create Classroom"
        submitLabel="Create"
        formProps={{ onSubmit }} error={!Boolean(name && displayName)}>
        <DevPageWarning />
        <TextField name="name" label="Name" variant="outlined" error={!/^\w{3,20}$/.test(name)} onChange={x => setName(x.target.value)} />
        <TextField name="displayName" label="Display Name" variant="outlined" onChange={x => setDisplayName(x.target.value)} />
    </FormPage>;
};

export default Page;