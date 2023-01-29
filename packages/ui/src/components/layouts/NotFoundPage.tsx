import { NextPage } from "next";
import { Link } from "@mui/material";
import { MouseEvent } from "react";
import StatusPage from "./StatusPage";

const NotFoundPage: NextPage = () => {
    function goBack(e: MouseEvent) {
        e.preventDefault();
        window.history.back();
    }

    return <StatusPage
        primary="404"
        secondary="Page Not Found"
        body={<>It&apos;s dangerous to go at all. Here, <Link href="#" onClick={goBack}>go back</Link>!</>}
    />;
};

export default NotFoundPage;