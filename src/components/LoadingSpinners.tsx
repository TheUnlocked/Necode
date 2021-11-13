import { useTheme } from "@mui/material";
import { Box } from "@mui/system";
import { useEffect, useState } from "react";
import { useLoadingContext } from "../api/client/LoadingContext";
import Spinner from "./Spinner";

export default function LoadingSpinners() {
    const [downloaders, setDownloaders] = useState(0);
    const [uploaders, setUploaders] = useState(0);

    const { addDownloadListener, addUploadListener, removeDownloadListener, removeUploadListener } = useLoadingContext();

    useEffect(() => {
        addDownloadListener(setDownloaders);
        addUploadListener(setUploaders);

        return () => {
            removeDownloadListener(setDownloaders);
            removeUploadListener(setUploaders);
        }
    }, [addDownloadListener, addUploadListener, removeDownloadListener, removeUploadListener]);

    const { palette } = useTheme();

    return <>
        <Box sx={{ height: "64px", width: "64px", position: "absolute", right: "32px", bottom: "32px" }}>
            <Spinner visible={downloaders > 0} color={palette.primary.main} />
        </Box>
        <Box sx={{ height: "64px", width: "64px", position: "absolute", right: "32px", bottom: "32px" }}>
            <Spinner visible={uploaders > 0} color={palette.secondary.main} offsetRatio={1 / 2} />
        </Box>
    </>;
}