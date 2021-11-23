import { Stack, Typography } from "@mui/material";
import { ReactNode } from "react";

interface StatusPageProps {
    primary?: ReactNode;
    secondary?: ReactNode;
    body?: ReactNode;
    children?: ReactNode;
}

export default function StatusPage({ primary, secondary, body, children }: StatusPageProps) {
    return <Stack direction="column" justifyContent="center" alignItems="center" sx={{
        position: "absolute",
        top: "var(--header-height)",
        left: 0,
        height: "calc(90vh - var(--header-height))",
        width: "calc(100vw - 64px)",
        mx: 4,
        textAlign: "center",
        pointerEvents: "none",
        "> *": {
            pointerEvents: "auto" 
        }
    }}>
        {primary ? <Typography variant="h1" fontSize="max(10vw, 6rem)" fontWeight="900">{primary}</Typography> : undefined}
        {secondary ? <Typography variant="h2" fontSize="max(3vw, 3rem)">{secondary}</Typography> : undefined}
        {body ? <Typography variant="body1" fontSize="max(1vw, 1.2rem)" my={2}>
            {body}
        </Typography> : undefined}
        {children}
    </Stack>
}