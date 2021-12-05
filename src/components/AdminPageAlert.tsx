import { Alert } from "@mui/material";

export default function AdminPageAlert() {
    return <Alert severity="error" variant="filled">
        Only administrators can access this page.
    </Alert>;
}