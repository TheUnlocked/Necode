import React, { useEffect, useState } from "react";
import MonacoEditor, { OnChange, useMonaco } from "@monaco-editor/react";
import { Box } from "@mui/material";
import dynamic from "next/dynamic";
import { IsolatedEditorProps } from "../src/components/IsolatedEditor";

const Editor = dynamic(() => Promise.resolve(() => {
    const [props, setProps] = useState<IsolatedEditorProps | undefined>();
    const [value, setValue] = useState<string | undefined>();

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
            switch (data.type) {
                case 'props': {
                    if (data.props.configureMonaco) {
                        setMonacoConfiguration(data.props.configureMonaco);
                        delete data.props.configureMonaco;
                    }
                    // Cannot set value from props requests, must send a setValue request
                    // The reason why is somewhat technical but basically has to do with
                    // an RPC race condition if you try to do it the intuitive way.
                    delete data.props.value;
                    setProps(Object.fromEntries(Object.entries(data.props).map(([key, value]: [string, any]) => {
                        if (value?.__isFunction__) {
                            return [key, (...args: any[]) => window.postMessage({
                                type: 'invokeFunction',
                                function: key,
                                args
                            }, window.location.origin)];
                        }
                        return [key, value];
                    })) as IsolatedEditorProps);
                    break;
                }
                case 'setValue': {
                    setValue(data.value);
                    break;
                }
            }
        });
        return () => window.removeEventListener('message', listener);
    }, []);

    const onChangeHandler: OnChange = (val, ev) => {
        setValue(val);
        props?.onChange?.(val, ev);
    };

    return <Box sx={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
        <MonacoEditor {...props} value={value} onChange={onChangeHandler} />
    </Box>;
}), { ssr: false });

export default Editor;