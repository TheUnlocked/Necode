import { Button, Skeleton, TextField, Typography } from "@mui/material";
import { NextPage } from "next";
import { useRouter } from "next/dist/client/router";
import { FormEventHandler, useEffect, useState } from "react";
import FormPage from "../../src/components/FormPage";
import { signIn } from "next-auth/react";
import { ClassroomEntity } from "../../src/api/entities/ClassroomEntity";
import { Response } from "../../src/api/Response";
import { useSnackbar } from "notistack";
import { useGetRequestImmutable } from "../../src/api/client/GetRequestHook";
import { UserEntity } from "../../src/api/entities/UserEntity";


const Join: NextPage = () => {
    const router = useRouter();
    const { data: session, isLoading } = useGetRequestImmutable<UserEntity>('/api/me');

    const [joinCode, setJoinCode] = useState("");

    useEffect(() => {
        if (router.query.joinCode) {
            setJoinCode(router.query.joinCode as string);
        }
    }, [router.query.joinCode]);

    const { enqueueSnackbar } = useSnackbar();

    if (!session) {
        return <FormPage title="Join a Classroom" error hideSubmit>
            {isLoading ? <Skeleton animation="wave" variant="rectangular" height="56px" sx={{ borderRadius: 1 }} /> : <>
                <Typography>You must sign in before you can join a classroom.</Typography>
                <Button variant="contained" onClick={() => signIn("wpi")}>Sign In</Button>
            </>}
        </FormPage>;
    }

    const onSubmit: FormEventHandler<HTMLFormElement> = async e => {
        e.preventDefault();

        const res = await fetch('/api/classroom/join', {
            method: "POST",
            body: JSON.stringify({ code: joinCode.toLowerCase() })
        });

        const data = (await res.json()) as Response<ClassroomEntity>;

        if (data.response === 'ok') {
            router.push(`/classroom/${data.data.id}/`);
            enqueueSnackbar(`Successfully joined ${data.data.attributes.displayName}! Redirecting...`, { variant: 'success' });
        }
        else {
            enqueueSnackbar('Failed to apply code. Make sure that you entered it correctly.', { variant: 'error' });
        }
    };

    return <FormPage
        title="Join a Classroom"
        submitLabel="Join"
        error={joinCode.length !== 6} formProps={{ onSubmit }}>
        <TextField
            name="code" label="Join Code" variant="outlined"
            value={joinCode} onChange={e => setJoinCode(e.target.value)} 
            inputProps={{ style: { textTransform: 'lowercase' } }} />
    </FormPage>;
};

export default Join;