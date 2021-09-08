import React, { useEffect, useState } from "react";
import MonacoEditor, { useMonaco } from "@monaco-editor/react";
import { Box } from "@mui/material";
import dynamic from "next/dynamic";
import { orderedMessagePatcher } from "../util/OrderedEvents";

const Editor = dynamic(() => Promise.resolve(() => {
    const [props, setProps] = useState<any>(null);
    
    const monaco = useMonaco();
    const [monacoConfiguration, setMonacoConfiguration] = useState("null");

    useEffect(() => {
        window.postMessage({ type: 'ready' }, window.location.origin);
    }, []);

    useEffect(() => {
        if (monaco) {
            eval(monacoConfiguration);
        }
    }, [monaco, monacoConfiguration]);

    
    useEffect(() => {
        let listener: (ev: MessageEvent<any>) => any;
        window.addEventListener('message', listener = ({data}) => {
            if (data.type === 'props') {
                if (data.props.configureMonaco) {
                    setMonacoConfiguration(data.props.configureMonaco);
                    delete data.props.configureMonaco;
                }
                setProps((oldProps: any) => Object.fromEntries(Object.entries(data.props).map(([key, value]: [string, any]) => {
                    if (value?.__isFunction__) {
                        return [key, (...args: any[]) => window.postMessage({
                            type: 'invokeFunction',
                            function: key,
                            args
                        }, window.location.origin)];
                    }
                    if (key === 'value' && oldProps?.__preserveValue__) {
                        if (oldProps?.path === 'a.ts') console.log("preserved", oldProps?.value);
                        return [key, oldProps.value];
                    }
                    return [key, value];
                })));
            }
        });
        return () => window.removeEventListener('message', listener);
    }, []);

    return <Box sx={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
        <MonacoEditor {...props} />
    </Box>;
}), { ssr: false });

export default Editor;