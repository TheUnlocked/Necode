import { TextField, Alert, Button } from "@mui/material";
import { NextPage } from "next";
import FormPage from "../../src/components/FormPage";
import { signIn, signOut, useSession } from "next-auth/react";
import DevPageWarning from "../../src/components/DevPageWarning";
import { FormEventHandler, useCallback, useState } from "react";
import { PostRequestData } from "../api/classroom";
import { useSnackbar } from 'notistack';

const Page: NextPage = () => {
    const { data: session } = useSession();

    const [name, setName] = useState("");
    const [displayName, setDisplayName] = useState("");

    const { enqueueSnackbar, closeSnackbar } = useSnackbar();

    const onSubmit: FormEventHandler<HTMLFormElement> = useCallback(async e => {
        e.preventDefault();
        
        const response = await fetch('/api/classroom', {
            method: 'POST',
            body: JSON.stringify({
                name,
                displayName
            } as PostRequestData)
        });

        if (response.ok) {

        }
        else {
            enqueueSnackbar('Failed to create classroom', { variant: 'error' });
        }
    }, [name, displayName, enqueueSnackbar]);

    return <FormPage
        title="Create Classroom"
        submitLabel="Create"
        formProps={{ onSubmit }} error={!Boolean(name && displayName)}>
        <DevPageWarning />
        <TextField name="name" label="Name" variant="outlined" onChange={x => setName(x.target.value)} />
        <TextField name="displayName" label="Display Name" variant="outlined" onChange={x => setDisplayName(x.target.value)} />
    </FormPage>;
};

export default Page;