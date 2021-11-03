import Editor, { OnChange, OnMount } from "@monaco-editor/react";
import { Button, Card, CardContent, Checkbox, IconButton, Portal, Stack, styled, Tooltip, Typography } from "@mui/material";
import { ReflexContainer, ReflexElement, ReflexSplitter } from "react-reflex";
import useIsSizeOrSmaller from "../../hooks/ScreenSizeHook";
import { cssDescription } from "../../languages/css";
import { htmlDescription } from "../../languages/html";
import LanguageDescription from "../../languages/LangaugeDescription";
import { ActivityConfigComponentProps, ActivityPageProps } from "../ActivityDescription";
import { Refresh as RefreshIcon, Sync as SyncIcon } from "@mui/icons-material";
import { Box } from "@mui/system";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import React from "react";
import iframeHtml from "raw-loader!./iframe.html";
import { nanoid } from "nanoid";
import useCodeGenerator from "../../hooks/CodeGeneratorHook";
import { $void } from "../../util/fp";
import supportsAmbient from "../../languages/features/SupportsAmbient";
import supportsIsolated from "../../languages/features/SupportsIsolated";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { typeAssert } from "../../util/typeguards";

type OptionalConfig<T>
    = { enabled: true } & T
    | { enabled: false } & Partial<T>;

export interface TestActivityConfig {
    description: string;
    html: OptionalConfig<{ defaultValue: string }>;
    code: OptionalConfig<{ defaultValue: { [langName: string]: string } }>;
    css: OptionalConfig<{ defaultValue: string }>;
}

const StretchedIFrame = styled("iframe")`
    width: 100%;
    flex-grow: 1;
    border: none;
    border-radius: 4px;
`;

const Key = styled("code")(({theme}) => ({
    backgroundColor: theme.palette.grey[800],
    color: theme.palette.text.primary,
    padding: "0 4px",
    margin: "0 2px",
    "&:first-of-type": {
        marginLeft: 0,
    },
    "&:last-of-type": {
        marginRight: 0,
    },
    borderRadius: 4
}));

function createTestActivityPage({ isEditor }: { isEditor: boolean }) {
    return function (props: ActivityConfigComponentProps<TestActivityConfig> | ActivityPageProps<TestActivityConfig>) {
        const {
            language,
            activityConfig: {
                description,
                html,
                code,
                css
            },
            onActivityConfigChange
        } = props as (typeof props) & Partial<ActivityConfigComponentProps<TestActivityConfig> & ActivityPageProps<TestActivityConfig>>;

        const isSmallOrSmaller = useIsSizeOrSmaller("sm");
        const isMediumOrSmaller = useIsSizeOrSmaller("md");
        const isLargeOrSmaller = useIsSizeOrSmaller("lg");
        
        const codeGenerator = useCodeGenerator<[typeof supportsAmbient, typeof supportsIsolated]>(language.name);

        type EditorType = 'html' | 'css' | 'code';
        type EditorStateDispatchAction = { target: EditorType } &
            ( { type: 'initialize', value: string, portalTarget: HTMLDivElement }
            | { type: 'updatePortal', portalTarget: HTMLDivElement }
            | { type: 'valueChange', value: string }
            | { type: 'applyChanges', resolve?: (state: EditorState) => void, reject?: (reason: 'nochange') => void });
        type EditorState = {
            readonly isDirty: boolean;
            readonly uncommittedValue: string;
            readonly value: string;
            
            // portal data
            readonly portalTarget: HTMLDivElement;
        };
        const [editorStates, dispatchEditorsState] = useReducer((state: {
            html?: EditorState,
            code?: EditorState,
            css?: EditorState,
        }, action: EditorStateDispatchAction) => {
            switch (action.type) {
                case 'initialize':
                    return {...state, [action.target]: {
                        isDirty: false,
                        uncommittedValue: action.value,
                        value: action.value,
                        portalTarget: action.portalTarget
                    } as EditorState};
                case 'updatePortal':
                    if (action.portalTarget === state[action.target]?.portalTarget) {
                        // no change
                        return state;
                    }
                    return {...state, [action.target]: {
                        ...state[action.target],
                        portalTarget: action.portalTarget
                    } as EditorState};
                case 'valueChange':
                    return {...state, [action.target]: {
                        ...state[action.target],
                        isDirty: true,
                        uncommittedValue: action.value
                    } as EditorState};
                case 'applyChanges':
                    if (state[action.target]?.isDirty) {
                        const newState = {
                            ...state[action.target]!,
                            value: state[action.target]!.uncommittedValue,
                            isDirty: false
                        } as EditorState;
                        action.resolve?.(newState);
                        return {...state, [action.target]: newState};
                    }
                    else {
                        action.reject?.('nochange');
                    }
                    return state;
            }
        }, {});

        const applyChangesRef = useRef<(type: EditorType, value: string) => void>(() => {});
        const applyChanges = useCallback((type: EditorType) => {
            // currently only CSS is supported for hot reload
            if (type === 'css') {
                dispatchEditorsState({
                    target: type,
                    type: 'applyChanges',
                    resolve: ({value}) => applyChangesRef.current(type, value)
                });
            }
            else {
                dispatchEditorsState({
                    target: type,
                    type: 'applyChanges',
                    resolve: reload
                });
            }
        }, []);

        const iframeRef = useRef<HTMLIFrameElement | null>(null);
        const [iframeElt, setIframeElt] = useState<HTMLIFrameElement | null>(null);

        const [isReloadScheduled, scheduleReload] = useState(false);
        function reload() {
            scheduleReload(true);
        }

        useEffect(() => {
            if (isReloadScheduled && iframeElt) {
                scheduleReload(false);

                iframeElt.srcdoc = iframeHtml;

                const signature = nanoid();
        
                const listener = (ev: MessageEvent<any>) => {
                    if (ev.data?.type === 'activity-iframe-loaded') {
                        window.removeEventListener('message', listener);

                        if (!iframeElt.contentWindow) {
                            // iframe is probably gone already
                            return;
                        }

                        iframeElt.contentWindow!.postMessage({ type: 'initialize', signature }, '*');

                        const applyChanges = (type: EditorType, value: string) => {
                            if (type === 'code') {
                                value = codeGenerator.toRunnerCode(value, { ambient: true, isolated: true })
                            }
                            iframeElt!.contentWindow!.postMessage({ type, value, signature }, '*');
                        };

                        applyChangesRef.current = applyChanges;

                        if (html.enabled && editorStates.html?.value) {
                            applyChanges('html', editorStates.html.value);
                        }
                        if (code.enabled && editorStates.code?.value) {
                            applyChanges('code', editorStates.code.value);
                        }
                        if (css.enabled && editorStates.css?.value) {
                            applyChanges('css', editorStates.css.value);
                        }
                    }
                };

                window.addEventListener('message', listener);
                setTimeout(() => {
                    // Clean up just in case the event listener wasn't removed.
                    // After 5 seconds it should've loaded already.
                    // Normal useEffect cleanup doesn't work since the dependencies
                    // could change before the event listener fires normally.
                    window.removeEventListener('message', listener);
                }, 5000);
            }
        }, [isReloadScheduled, editorStates, iframeElt, codeGenerator, html.enabled, code.enabled, css.enabled]);

        useEffect(() => {
            if (iframeElt && iframeRef.current !== iframeElt) {
                iframeRef.current = iframeElt;
                reload();
            }
        }, [iframeElt]);

        const applyAllChanges = useCallback(() => {
            const promises = [] as Promise<void>[];
            if (html.enabled) {
                promises.push(new Promise(resolve => {
                    dispatchEditorsState({
                        target: 'html',
                        type: 'applyChanges',
                        resolve: ({value}) => {
                            applyChangesRef.current('html', value);
                            resolve();
                        },
                        reject: $void(resolve)
                    });
                }));
            }
            if (code.enabled) {
                promises.push(new Promise(resolve => {
                    dispatchEditorsState({
                        target: 'code',
                        type: 'applyChanges',
                        resolve: ({value}) => {
                            applyChangesRef.current('code', value);
                            resolve();
                        },
                        reject: $void(resolve)
                    });
                }));
            }
            if (css.enabled) {
                promises.push(new Promise(resolve => {
                    dispatchEditorsState({
                        target: 'css',
                        type: 'applyChanges',
                        resolve: ({value}) => {
                            applyChangesRef.current('css', value);
                            resolve();
                        },
                        reject: $void(resolve)
                    });
                }));
            }
            return Promise.allSettled(promises);
        }, [html.enabled, code.enabled, css.enabled]);

        const editorPane = useCallback((type: EditorType, language: LanguageDescription) => {
            const editorState = editorStates[type];

            const onEditorContainerRef = (elt: HTMLDivElement) => {
                if (elt) {
                    if (editorState) {
                        dispatchEditorsState({ target: type, type: 'updatePortal', portalTarget: elt });
                    }
                    else {
                        if (type === 'code') {
                            dispatchEditorsState({ target: type, type: 'initialize', value: props.activityConfig.code.defaultValue![language.name], portalTarget: elt });
                        }
                        else {
                            dispatchEditorsState({ target: type, type: 'initialize', value: props.activityConfig[type].defaultValue!, portalTarget: elt });
                        }
                    }
                }
            }

            const Icon = language.icon;

            const showKeybindingHint = !isMediumOrSmaller && editorState?.isDirty;

            return <ReflexElement minSize={40}>
                <Stack direction="column" sx={{ height: "100%" }}>
                    <Stack direction="row" sx={{ m: 1, height: "24px" }}>
                        {isEditor
                            ? <Checkbox sx={{ m: "-9px", mr: 0 }}
                                value={props.activityConfig[type].enabled}
                                onChange={ev => onActivityConfigChange!({
                                    ...props.activityConfig,
                                    [type]: {
                                        ...props.activityConfig[type],
                                        enabled: ev.target.checked
                                    }
                                })} />
                            : undefined}
                        {Icon ? <Icon /> : undefined}
                        <Typography variant="overline" sx={{ ml: 1 }}>{language.displayName}</Typography>
                        {showKeybindingHint
                            ? <Typography variant="overline" sx={{ pl: 2, ml: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                Press <Key>Ctrl</Key>+<Key>S</Key> to apply changes
                            </Typography>
                            : undefined}
                        <Button onClick={() => applyChanges(type)} disabled={!editorState?.isDirty}
                            sx={{ pl: 2, ml: showKeybindingHint ? undefined : "auto", flexShrink: 0 }}>
                            Apply changes
                        </Button>
                    </Stack>
                    <Box ref={onEditorContainerRef} sx={{
                        flexGrow: 1,
                        ".monaco-editor .suggest-widget": { zIndex: 101 },
                        ".monaco-hover": { zIndex: 102 },
                    }} />
                </Stack>
            </ReflexElement>;
        }, [isMediumOrSmaller, editorStates, applyChanges, props.activityConfig, onActivityConfigChange]);

        const iframe = <StretchedIFrame ref={setIframeElt} sandbox="allow-scripts" />;

        const descriptionPane = <ReflexElement minSize={40} flex={!isLargeOrSmaller ? 2 : undefined}>
            <Card sx={{ height: "100%" }}>
                <Stack direction="column" sx={{ height: "100%" }}>
                    <Stack direction="row" sx={{ m: 1, height: "24px" }}>
                        {/* icon */}
                        <Typography variant="overline" sx={{ ml: 1 }}>Instructions</Typography>
                    </Stack>
                    {isEditor
                        ? <Editor
                            theme="vs-dark"
                            options={{
                                minimap: { enabled: false },
                                "semanticHighlighting.enabled": true,
                                automaticLayout: true,
                                fixedOverflowWidgets: true,
                                lineNumbers: "off",
                                lineDecorationsWidth: 0,
                            }}
                            defaultLanguage="markdown"
                            value={description}
                            onChange={val => onActivityConfigChange!({
                                ...props.activityConfig,
                                description: val ?? ""
                            })} />
                        : <CardContent sx={{ pt: 0, flexGrow: 1, overflow: "auto" }}>
                            <ReactMarkdown rehypePlugins={[rehypeHighlight]} remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
                        </CardContent>}
                </Stack>
            </Card>
        </ReflexElement>;

        const codeEditors = [
            html.enabled ? editorPane('html', htmlDescription) : undefined,
            html.enabled && (code.enabled || css.enabled) ? <ReflexSplitter propagate={true} /> : undefined,
            code.enabled ? editorPane('code', language) : undefined,
            code.enabled && css.enabled ? <ReflexSplitter propagate={true} /> : undefined,
            css.enabled ? editorPane('css', cssDescription) : undefined,
        ];

        const controls = <Stack direction="row" justifyContent="end" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Tooltip title="Apply all changes">
                <IconButton onClick={applyAllChanges}><SyncIcon/></IconButton>
            </Tooltip>
            <Tooltip title="Reload">
                <IconButton onClick={reload}><RefreshIcon/></IconButton>
            </Tooltip>
            <Button variant="contained">Submit</Button>
        </Stack>;

        const editor = useCallback((type: EditorType, language: LanguageDescription) => {
            const editorState = editorStates[type];

            if (!editorState) {
                return undefined;
            }

            const onMount: OnMount = (editor, monaco) => {
                editor.addAction({
                    id: 'apply-changes',
                    label: 'Apply Changes',
                    keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S
                    ],
                    run: () => applyChanges(type)
                });
            };

            const onChange: OnChange = (value) => {
                dispatchEditorsState({ target: type, type: 'valueChange', value: value ?? '' });
            };

            return <Editor
                theme="vs-dark"
                options={{
                    minimap: { enabled: false },
                    "semanticHighlighting.enabled": true,
                    automaticLayout: true,
                    fixedOverflowWidgets: true
                }}
                defaultLanguage={language.monacoName}
                onMount={onMount}
                value={editorState?.uncommittedValue}
                onChange={onChange}
            />;
        }, [editorStates, applyChanges]);

        let layout: JSX.Element;

        if (isSmallOrSmaller) {
            layout = <>
                {controls}
                <Card sx={{ height: "calc(100% - 36px)", flexGrow: 1, display: "flex", flexDirection: "column" }}>
                    {/* Need to use createElement to allow spreading codeEditors to suppress React key warnings.
                    * It's not pretty, but the React team apparently refuses to budge on this.
                    * (see https://github.com/facebook/react/issues/14374 and https://github.com/facebook/react/issues/12567) */}
                    {React.createElement(ReflexContainer, {},
                        descriptionPane,
                        <ReflexSplitter propagate={true} />,
                        ...codeEditors,
                        <ReflexSplitter propagate={true} />,
                        <ReflexElement>
                            <Stack direction="column" sx={{ height: "100%" }}>
                                {iframe}
                            </Stack>
                        </ReflexElement>
                    )}
                </Card>
            </>;
        }
        else if (isLargeOrSmaller) {
            layout = <ReflexContainer orientation="vertical">
                <ReflexElement minSize={40}>
                    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                            {/* See above comment in the isSmallOrSmaller variant */}
                            {React.createElement(ReflexContainer, {},
                                descriptionPane,
                                <ReflexSplitter propagate={true} />,
                                ...codeEditors
                            )}
                    </Card>
                </ReflexElement>
                <ReflexSplitter/>
                <ReflexElement minSize={250}>
                    <Stack direction="column" sx={{ height: "100%" }}>
                        {controls}
                        {iframe}
                    </Stack>
                </ReflexElement>
            </ReflexContainer>;
        }
        else {
            layout = <ReflexContainer orientation="vertical">
                {descriptionPane}
                <ReflexSplitter propagate={true} />
                <ReflexElement minSize={40} flex={3}>
                    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                            {/* See above comment in the isSmallOrSmaller variant */}
                            {React.createElement(ReflexContainer, {},
                                ...codeEditors
                            )}
                    </Card>
                </ReflexElement>
                <ReflexSplitter propagate={true} />
                <ReflexElement minSize={250} flex={2}>
                    <Stack direction="column" sx={{ height: "100%" }}>
                        {controls}
                        {iframe}
                    </Stack>
                </ReflexElement>
            </ReflexContainer>;
        }

        return <>
            {html.enabled && editorStates.html ? <Portal container={editorStates.html.portalTarget}>{editor('html', htmlDescription)}</Portal> : undefined}
            {code.enabled && editorStates.code ? <Portal container={editorStates.code.portalTarget}>{editor('code', language)}</Portal> : undefined}
            {css.enabled && editorStates.css ? <Portal container={editorStates.css.portalTarget}>{editor('css', cssDescription)}</Portal> : undefined}
            {layout}
        </>;
    }
}

export const TestActivity = createTestActivityPage({ isEditor: false });
export const TestActivityConfigPage = createTestActivityPage({ isEditor: true });