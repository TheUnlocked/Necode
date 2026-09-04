import { Button, Skeleton, TextField, Typography } from "@mui/material";
import { NextPage } from "next";
import { useRouter } from "next/dist/client/router";
import { FormEventHandler, useState } from "react";
import FormPage from "~ui/components/layouts/FormPage";
import { signIn } from "next-auth/react";
import { ClassroomEntity } from "~api/entities/ClassroomEntity";
import { useSnackbar } from "notistack";
import { useGetRequestImmutable } from "~shared-ui/hooks/useGetRequest";
import { UserEntity } from "~api/entities/UserEntity";
import useNecodeFetch from '~shared-ui/hooks/useNecodeFetch';
import useChanged from "~shared-ui/hooks/useChanged";


const Join: NextPage = () => {
    const router = useRouter();
    const { data: me, isLoading } = useGetRequestImmutable<UserEntity>('/api/me');

    const { upload } = useNecodeFetch();

    const [joinCode, setJoinCode] = useState('');

    const joinCodeFromRouter = router.query.joinCode;
    if (useChanged(joinCodeFromRouter, true)) {
        if (typeof joinCodeFromRouter === 'string') {
            setJoinCode(joinCodeFromRouter);
        }
    }

    const { enqueueSnackbar } = useSnackbar();

    if (!me) {
        return <FormPage title="Join a Classroom" error hideSubmit>
            {isLoading ? <Skeleton animation="wave" variant="rectangular" height="56px" sx={{ borderRadius: 1 }} /> : <>
                <Typography>You must sign in before you can join a classroom.</Typography>
                <Button variant="contained" onClick={() => signIn(process.env.NEXT_PUBLIC_APP_ENV === 'production' ? "wpi" : undefined)}>Sign In</Button>
            </>}
        </FormPage>;
    }

    const onSubmit: FormEventHandler<HTMLFormElement> = async e => {
        e.preventDefault();

        const classroom = await upload<ClassroomEntity>('/api/classroom/join', {
            method: "POST",
            body: JSON.stringify({ code: joinCode.toLowerCase() }),
            errorMessage: 'Failed to apply code. Make sure that you entered it correctly.',
        });

        router.push(`/classroom/${classroom.id}/`);
        enqueueSnackbar(`Successfully joined ${classroom.attributes.displayName}! Redirecting...`, { variant: 'success' });
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