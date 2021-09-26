import { TextField, Alert, Button } from "@mui/material";
import { NextPage } from "next";
import FormPage from "../../src/components/FormPage";
import { signIn, signOut, useSession } from "next-auth/react";
import DevPageWarning from "../../src/components/DevPageWarning";
import { FormEventHandler } from "react";

const Page: NextPage = () => {
    const { data: session } = useSession();

    const onSubmit: FormEventHandler<HTMLFormElement> = async e => {
        e.preventDefault();
        signIn('dev', { redirect: false, username: (document.getElementById('dev-login-username') as HTMLInputElement).value });
    }

    return <FormPage
        title="Developer Login"
        submitLabel="Sign in"
        formProps={{ onSubmit }} error={Boolean(session)}
        extraButtons={session ? [
            <Button key={0} variant="outlined" onClick={() => signOut({ redirect: false })}>Sign out</Button>
        ] : []}>
        <DevPageWarning />
        {session
            ? session.user.username.startsWith('dev')
                ? <Alert severity="success">You are already logged in!</Alert>
                : <Alert severity="error">You are already logged in with a normal user account.</Alert>
            : <TextField id="dev-login-username" name="username" label="Username" variant="outlined" />}
    </FormPage>;
};

export default Page;