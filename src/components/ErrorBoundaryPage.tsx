import { Stack, Typography, Link } from "@mui/material";
import { MouseEvent } from "react";
import StatusPage from "./StatusPage";

export default function ErrorBoundaryPage() {
    function goBack(e: MouseEvent) {
        e.preventDefault();
        window.history.back();
    }

    function refresh(e: MouseEvent) {
        e.preventDefault();
        window.location.reload();
    }

    return <StatusPage
        primary="-1"
        secondary="Runtime Error"
        body={<>Something broke. You may want to <Link href="#" onClick={refresh}>refresh</Link>, or possibly to <Link href="#" onClick={goBack}>go back</Link>.</>}
    />;
}