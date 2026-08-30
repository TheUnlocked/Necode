import { ContentCopy, Refresh, Share } from '@mui/icons-material';
import { Box, IconButton, Skeleton, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import { useConfirm } from 'material-ui-confirm';
import { useSnackbar } from 'notistack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'react-qr-code';
import useNecodeFetch from '~shared-ui/hooks/useNecodeFetch';

export interface JoinCodeCardProps {
    classroomId: string | undefined;
}

export default function JoinCodeCard({ classroomId }: JoinCodeCardProps) {
    const { download, upload } = useNecodeFetch();

    const [joinCode, setJoinCode] = useState<string>();

    useEffect(() => {
        if (classroomId && joinCode === undefined) {
            download<string>(`/api/classroom/${classroomId}/join-code`, { method: 'POST' })
                .then(setJoinCode);
        }
    }, [classroomId, joinCode, download]);
    
    const { enqueueSnackbar } = useSnackbar();

    const copyJoinCodeToKeyboard = useCallback(() => {
        if (joinCode) {
            navigator.clipboard.writeText(joinCode)
                .then(() => enqueueSnackbar('Copied join code to clipboard', { variant: 'success' }))
                .catch(() => enqueueSnackbar('Failed to copy to clipboard', { variant: 'error' }));
        }
    }, [joinCode, enqueueSnackbar]);
    
    const joinLink = useMemo(() => joinCode ? `${location.origin}/classroom/join?joinCode=${joinCode}` : undefined, [joinCode]);

    const copyJoinLinkToKeyboard = useCallback(() => {
        if (joinLink) {
            navigator.clipboard.writeText(joinLink)
                .then(() => enqueueSnackbar('Copied join link to clipboard', { variant: 'success' }))
                .catch(() => enqueueSnackbar('Failed to copy to clipboard', { variant: 'error' }));
        }
    }, [joinLink, enqueueSnackbar]);

    const confirm = useConfirm();

    const resetJoinCode = useCallback(async () => {
        try {
            if ((await confirm({ description: 'Are you sure you want to reset the join code? The old join code can never be recovered.' })).confirmed) {
                await upload(`/api/classroom/${classroomId}/join-code`, { method: 'DELETE' });
                setJoinCode(undefined);
            }
        }
        catch (e) {}
    }, [classroomId, confirm, upload]);

    const theme = useTheme();

    return <Stack direction="row" sx={{ width: 'max-content' }}>
        <Stack direction="column" sx={{ pr: 2 }}>
            <Stack direction="row" sx={{ alignItems: "center", my: "-6px" }}>
                <Typography variant="body1">Join Code</Typography>
                {joinCode ? <Tooltip title="Reset Join Code" disableInteractive>
                    <IconButton onClick={resetJoinCode}>
                        <Refresh fontSize="small"/>
                    </IconButton>
                </Tooltip> : null}
            </Stack>
            {joinCode
                ? <Typography variant="h3" component="div" sx={{ mt: 1 }}>{joinCode}</Typography>
                : <Typography variant="h3" component="div" sx={{ mt: 1 }}><Skeleton /></Typography>}
            {/* Necode is not currently supported on mobile devices, so a QR code is probably not that helpful... */}
            {/* {joinLink
                ? <Box sx={{ mt: 1 }}><QRCode value={joinLink} bgColor={theme.palette.text.primary} fgColor="transparent" style={{ width: '60%', height: 'auto' }} /></Box>
                : <Typography variant="h3" component="div" sx={{ mt: 1 }}><Skeleton /></Typography>} */}
        </Stack>
        {joinCode ? <Stack direction="column" justifyContent="flex-start" spacing={1} sx={{ py: 1 }}>
            <Tooltip title="Copy Join Code" disableInteractive><IconButton onClick={copyJoinCodeToKeyboard}><ContentCopy/></IconButton></Tooltip>
            <Tooltip title="Copy Join Link" disableInteractive><IconButton onClick={copyJoinLinkToKeyboard}><Share/></IconButton></Tooltip>
        </Stack> : undefined}
    </Stack>;
}