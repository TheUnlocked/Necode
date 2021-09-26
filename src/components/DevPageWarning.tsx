import { Alert } from "@mui/material";

export default function DevPageWarning() {
    return <Alert severity="warning" variant="filled">
        This is a developer page and is not available in production
    </Alert>;
}