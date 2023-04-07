import { NextPage } from "next";
import React from "react";
import { Card } from "@mui/material";
import { useRouter } from "next/router";

const Login: NextPage = () => {
    const router = useRouter();

    return <Card>
        Login Failed
        <br/>
        {router.query.error ? `Reason: ${router.query.error}` : undefined}
    </Card>;
};

export default Login;