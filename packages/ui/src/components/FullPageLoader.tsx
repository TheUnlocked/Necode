import { CircularProgress } from "@mui/material";

export default function FullPageLoader() {
    return <CircularProgress variant="indeterminate" sx={{
        position: "absolute",
        left: "50vw",
        top: "50vh",
        ml: "-20px",
        mt: "-20px"
    }} />;
}