import { Alert } from "@mui/material";
import React from "react";

export interface CodeAlertProps {
    error?: Error | undefined;
    successMessage?: string | undefined;
}

function fancyError(message: string) {
    const result = [] as (string | JSX.Element)[];
    let buffer = '';
    let mode = 'normal' as 'normal' | 'code';
    function clearBuffer(newMode: typeof mode) {
        if (buffer) {
            if (mode === 'normal') {
                result.push(buffer);
            }
            else {
                result.push(<code style={{ whiteSpace: 'pre' }}>{buffer}</code>);
            }
        }
        mode = newMode;
        buffer = '';
    }
    for (const ch of message) {
        switch (ch) {
            case '`':
                clearBuffer(mode === 'code' ? 'normal' : 'code');
                break;
            case '\n':
                if (mode === 'normal') {
                    clearBuffer('normal');
                    result.push(<br />);
                    break;
                }
            default:
                buffer += ch;
        }
    }
    clearBuffer('normal');
    return result;
}

export default function CodeAlert({ error, successMessage }: CodeAlertProps) {
    return <Alert severity={error ? "error" : "success"} sx={{ wordBreak: "break-word" }}>
        {error
            ? React.createElement(React.Fragment, {}, `${error.name}: `, ...fancyError(error.message))
            : successMessage ?? "Your code ran successfully!"}
    </Alert>;
}