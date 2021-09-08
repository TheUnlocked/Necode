import { EditorProps } from "@monaco-editor/react";
import { styled } from "@mui/system";
import { useEffect, useRef } from "react";
import { orderedListener } from "../util/OrderedEvents";

const InvisibleIframe = styled("iframe")`
    display: block;
    border: none;
    height: 100%;
    width: 100%;
`;

export interface IsolatedEditorProps extends EditorProps {
    /** 
     * A function for configuring monaco which will be stringified and evaled inside the monaco iframe.
     * 
     * A `monaco` variable should be declared for use in the `configureMonaco` function:
     * ```ts
     * declare const monaco: Monaco;
     * ```
     * 
     * Note that outside variables WILL NOT be captured. If capturing would be useful, a string containing
     * the code to be evaled can be provided instead.
     */
    configureMonaco: Function | string;
}

export default function IsolatedEditor(props: IsolatedEditorProps) {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const lastValuesRef = useRef([] as (string | undefined)[]);
    const inEventLoopRef = useRef(false);

    inEventLoopRef.current = false;

    useEffect(() => {
        if (iframeRef.current?.contentWindow) {
            const fns: { [key: string]: Function } = {};
            const fixedProps: { [key: string]: any } = {};
            for (const key of Object.keys(props) as (keyof typeof props)[]) {
                if (key === 'configureMonaco') {
                    fixedProps['configureMonaco'] = typeof props.configureMonaco === 'string'
                        ? props.configureMonaco
                        : `(${props.configureMonaco.toString()})()`;
                }
                else if (props[key] instanceof Function) {
                    fns[key] = props[key] as Function;
                    fixedProps[key] = {
                        __isFunction__: true,
                        functionName: key
                    };
                }
                else {
                    if (key === 'value') {
                        if (lastValuesRef.current.includes(props.value)) {
                            fixedProps.__preserveValue__ = true;
                            if (props.path === 'a.ts') console.log("sent preserve");
                        }
                        else {
                            if (lastValuesRef.current.length > 0) {
                                if (props.path === 'a.ts') console.log("no input, sent", props[key]);
                            }
                            else {
                                if (props.path === 'a.ts') console.log("overwrote", lastValuesRef.current[lastValuesRef.current.length - 1]);
                                if (props.path === 'a.ts') console.log("sent", props[key]);
                            }
                        }
                    }
                    fixedProps[key] = props[key];
                }
            }

            const contentWindow = iframeRef.current.contentWindow;
            let listener: (ev: MessageEvent<any>) => any;
            contentWindow.addEventListener('message', listener = ({data}) => {
                if (!inEventLoopRef.current) {
                    lastValuesRef.current = [props.value];
                    inEventLoopRef.current = true;
                }

                if (data.type === 'invokeFunction') {
                    if (data.function === 'onChange') {
                        lastValuesRef.current.push(data.args[0]);
                    }
                    fns[data.function](...data.args);
                }
                else if (data.type === 'ready') {
                    // We might be sending this an extra time, but that's okay.
                    contentWindow.postMessage({
                        type: "props",
                        props: fixedProps
                    }, window.location.origin);
                }
            });

            contentWindow.postMessage({
                type: "props",
                props: fixedProps
            }, window.location.origin);

            return () => contentWindow.removeEventListener('message', listener);
        }
    }, [props, iframeRef]);

    return <InvisibleIframe ref={iframeRef} src="/editor"/>;
}