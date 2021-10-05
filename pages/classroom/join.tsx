import { Button, Skeleton, TextField, Typography } from "@mui/material";
import { NextPage } from "next";
import { useRouter } from "next/dist/client/router";
import { FormEventHandler, useEffect, useState } from "react";
import FormPage from "../../src/components/FormPage";
import { signIn, useSession } from "next-auth/react";
import { ResponseData200 } from "../api/classroom/join";

const Join: NextPage = () => {
    const router = useRouter();
    const { data: session, status } = useSession();

    const [joinCode, setJoinCode] = useState("");

    useEffect(() => {
        if (router.query.joinCode) {
            setJoinCode(router.query.joinCode as string);
        }
    }, [router.query.joinCode]);

    if (!session) {
        return <FormPage title="Join a Classroom" error hideSubmit>
            {status === 'loading' ? <Skeleton animation="wave" variant="rectangular" height="56px" sx={{ borderRadius: 1 }} /> : <>
                <Typography>You must sign in before you can join a classroom.</Typography>
                <Button variant="contained" onClick={() => signIn("wpi")}>Sign In</Button>
            </>}
        </FormPage>;
    }

    const onSubmit: FormEventHandler<HTMLFormElement> = async e => {
        e.preventDefault();

        const res = await fetch(`/api/classroom/join?joinCode=${joinCode}`, {
            method: "POST"
        });

        if (res.ok) {
            const data = (await res.json()) as ResponseData200;
            router.push(`/classroom/${data.classroomId}/`);
        }
    };

    return <FormPage
        title="Join a Classroom"
        submitLabel="Join"
        error={joinCode === ""} formProps={{ onSubmit }}>
        <TextField
            name="code" label="Join Code" variant="outlined"
            value={joinCode} onChange={e => setJoinCode(e.target.value)} />
    </FormPage>;
};

export default Join;