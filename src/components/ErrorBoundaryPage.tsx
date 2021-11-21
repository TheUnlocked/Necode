import { Stack, Typography, Link } from "@mui/material";
import { MouseEvent } from "react";

export default function ErrorBoundaryPage() {
    function goBack(e: MouseEvent) {
        e.preventDefault();
        window.history.back();
    }
    
    return <Stack direction="column" justifyContent="center" alignItems="center" sx={{
        position: "absolute",
        top: "var(--header-height)",
        left: 0,
        height: "calc(90vh - var(--header-height))",
        width: "calc(100vw - 64px)",
        mx: 4,
        textAlign: "center"
    }}>
        <Typography variant="h1" fontSize="max(10vw, 6rem)" fontWeight="900">-1</Typography>
        <Typography variant="h2" fontSize="max(3vw, 3rem)">Runtime Error</Typography>
        <Typography variant="body1" fontSize="max(1vw, 1rem)" my={2}>
            Something broke. You may want to <Link href="#" onClick={goBack}>go back</Link>.
        </Typography>
    </Stack>;
}