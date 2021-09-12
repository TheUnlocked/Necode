import { EditorProps } from "@monaco-editor/react";
import { styled } from "@mui/system";
import { useCallback, useEffect, useRef, useState } from "react";

const InvisibleIframe = styled("iframe")`
    display: block;
    border: none;
    height: 100%;
    width: 100%;
`;

export interface IsolatedEditorProps extends Omit<EditorProps, 'value'> {
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
    configureMonaco?: Function | string;

    /**
     * A ref object which will be populated with a function to set the value of the monaco editor.
     * For technical reasons, the value of an isolated monaco editor cannot be set with the value property.
     */
    onSetValueChanged?: (setValue: (value: string) => void) => void;
}

export function useIsolatedEditor() {
    const valueBuffer = useRef<string | undefined>();
    const [setValue, setSetValue] = useState<(x: string) => void>(() => (x: string) => valueBuffer.current = x);

    const setValueChangedHandler = useCallback((newSetValue: (x: string) => void) => {
        if (valueBuffer.current !== undefined) {
            newSetValue(valueBuffer.current);
            valueBuffer.current = undefined;
        }
        setSetValue(() => newSetValue);
    }, []);

    const Editor = useCallback(function Editor(props: Omit<IsolatedEditorProps, 'onSetValueUpdate'>) {
        return <IsolatedEditor {...props} onSetValueChanged={setValueChangedHandler} />;
    }, [setValueChangedHandler]);

    return {
        Editor,
        setValue
    };
}

export default function IsolatedEditor(props: IsolatedEditorProps) {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);

    useEffect(() => {
        if (iframeRef.current?.contentWindow) {
            const fns: { [key: string]: Function } = {};
            const fixedProps: { [key: string]: any } = {};
            for (const key of Object.keys(props) as (keyof typeof props)[]) {
                if (key === 'onSetValueChanged') {
                    continue;
                }
                if (key === 'configureMonaco') {
                    fixedProps['configureMonaco'] = typeof props.configureMonaco === 'string'
                        ? props.configureMonaco
                        : `(${props.configureMonaco!.toString()})()`;
                }
                else if (props[key] instanceof Function) {
                    fns[key] = props[key] as Function;
                    fixedProps[key] = {
                        __isFunction__: true,
                        functionName: key
                    };
                }
                else {
                    fixedProps[key] = props[key];
                }
            }

            function setValue(value: string) {
                contentWindow.postMessage({
                    type: "setValue",
                    value
                }, window.location.origin);
            }

            if (props.onSetValueChanged) {
                props.onSetValueChanged(setValue);
            }

            const contentWindow = iframeRef.current.contentWindow;
            let listener: (ev: MessageEvent<any>) => any;
            contentWindow.addEventListener('message', listener = ({data}) => {
                if (data.type === 'invokeFunction') {
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