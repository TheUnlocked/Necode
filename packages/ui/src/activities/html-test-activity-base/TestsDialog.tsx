import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Box } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import useOnOpen from "../../hooks/useOnOpen";

type RunningState 
    = { type: 'pending' }
    | { type: 'running' }
    | { type: 'success' }
    | { type: 'failure', message: string }
    | { type: 'submitting' }
    ;

function runningStateToString(state: RunningState) {
    switch (state.type) {
        case 'pending':
            return 'Preparing';
        case 'running':
            return 'Running Tests';
        case 'success':
            return 'Passed All Tests!';
        case 'failure':
            return 'Test Failure';
        case 'submitting':
            return 'Submitting Solution';
    }
}

interface TestsDialogProps {
    open: boolean;
    mustPassToSubmit?: boolean;
    onClose?(): void;
    onCancel?(): void;
    onSubmit?(): void;
    startRunningRef?(callback: () => void): void;
    successRef?(callback: () => void): void;
    failureRef?(callback: (message: string) => void): void;
}

export default function TestsDialog({
    open,
    mustPassToSubmit = true,
    onClose,
    onCancel,
    onSubmit,
    startRunningRef,
    successRef,
    failureRef
}: TestsDialogProps) {
    const [state, setState] = useState<RunningState>({ type: 'pending' });

    useOnOpen(open, () => setState({ type: 'pending' }));
    
    const startRunning = useCallback(() => {
        setState({ type: 'running' });
    }, []);

    const success = useCallback(() => {
        setState({ type: 'success' });
    }, []);

    const failure = useCallback((message: string) => {
        setState({ type: 'failure', message });
    }, []);

    useEffect(() => {
        startRunningRef?.(startRunning);
    }, [startRunning, startRunningRef]);

    useEffect(() => {
        successRef?.(success);
    }, [success, successRef]);

    useEffect(() => {
        failureRef?.(failure);
    }, [failure, failureRef]);

    function cancel() {
        onCancel?.();
        onClose?.();
    }

    let content: JSX.Element = <></>;
    let actions: JSX.Element = <></>;

    switch (state.type) {
        case 'pending':
        case 'running': // in the future this may be determinate
            content = <Box sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "middle",
                height: "100%"
            }}>
                <CircularProgress />
            </Box>;
            actions = <>
                <Button onClick={cancel}>Cancel</Button>
            </>;
            break;
        case 'success':
            content = <DialogContentText>
                Your code ran successfully. Good job! You may now choose to submit your code to the teacher,
                or continue to work on it and submit later. Even after you submit, you will still be able to
                work on your solution. 
            </DialogContentText>;
            actions = <>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={onSubmit}>Submit Now</Button>
            </>;
            break;
        case 'failure':
            const encouragement = mustPassToSubmit ? null : <DialogContentText>
                Your instructor allows you to submit even if your solution hasn&apos;t passed all of the tests.
                If you choose to submit now, you can still keep working on it and submit a new version later.
            </DialogContentText>;

            if (state.message.startsWith('%SOURCE%')) {
                content = <>
                    <DialogContentText>
                        Your code failed to satisfy this condition:
                    </DialogContentText>
                    <pre>{state.message.slice('%SOURCE%'.length)}</pre>
                    {encouragement}
                </>;
            }
            else {
                content = <>
                    <DialogContentText>
                        Your code failed a test:
                    </DialogContentText>
                    <p>{state.message}</p>
                    {encouragement}
                </>;
            }
            if (mustPassToSubmit) {
                actions = <Button onClick={onClose}>Ok</Button>;
            }
            else {
                actions = <>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button onClick={onSubmit}>Submit Now</Button>
                </>;
            }
            break;
    }

    return <Dialog open={open} fullWidth>
        <DialogTitle>{runningStateToString(state)}</DialogTitle>
        <DialogContent>{content}</DialogContent>
        <DialogActions>{actions}</DialogActions>
    </Dialog>;
}