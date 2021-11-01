import Editor, { OnChange, OnMount } from "@monaco-editor/react";
import { Button, Card, CardContent, IconButton, Stack, styled, Tooltip, Typography } from "@mui/material";
import { ReflexContainer, ReflexElement, ReflexSplitter } from "react-reflex";
import useIsSizeOrSmaller from "../../hooks/ScreenSizeHook";
import { cssDescription } from "../../languages/css";
import { htmlDescription } from "../../languages/html";
import LanguageDescription from "../../languages/LangaugeDescription";
import { ActivityPageProps } from "../ActivityDescription";
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

export interface TestActivityConfig {
    description: string;
    starterCode: string;
    webEditor: {
        enabled: boolean;
        hasHtml: boolean;
        hasCss: boolean;
        hasCode: boolean;
    };
}

const StretchedIFrame = styled("iframe")`
    width: 100%;
    flex-grow: 1;
    border: none;
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

export default function TestActivity({
    classroom,
    language,
    activityConfig: {
        description,
        starterCode,
        webEditor: { enabled: webEditorEnabled, hasHtml, hasCss, hasCode }
    }
}: ActivityPageProps<TestActivityConfig>) {
    const isSmallOrSmaller = useIsSizeOrSmaller("sm");
    const isMediumOrSmaller = useIsSizeOrSmaller("md");
    const isLargeOrSmaller = useIsSizeOrSmaller("lg");
    
    const codeGenerator = useCodeGenerator<[typeof supportsAmbient, typeof supportsIsolated]>(language.name);

    type EditorType = 'html' | 'css' | 'code';
    type EditorStateDispatchAction = { target: EditorType } &
        ( { type: 'initialize', value: string }
        | { type: 'valueChange', value: string }
        | { type: 'applyChanges', resolve?: (state: EditorState) => void, reject?: (reason: 'nochange') => void });
    type EditorState = {
        readonly isDirty: boolean;
        readonly uncommittedValue: string;
        readonly value: string;
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

                    iframeElt.contentWindow!.postMessage({ type: 'initialize', signature }, '*');

                    const applyChanges = (type: EditorType, value: string) => {
                        if (type === 'code') {
                            value = codeGenerator.toRunnerCode(value, { ambient: true, isolated: true })
                        }
                        iframeElt!.contentWindow!.postMessage({ type, value, signature }, '*');
                    };

                    applyChangesRef.current = applyChanges;

                    if (hasHtml && editorStates.html?.value) {
                        applyChanges('html', editorStates.html.value);
                    }
                    if (hasCode && editorStates.code?.value) {
                        applyChanges('code', editorStates.code.value);
                    }
                    if (hasCss && editorStates.css?.value) {
                        applyChanges('css', editorStates.css.value);
                    }
                }
            };

            window.addEventListener('message', listener);
            return () => window.removeEventListener('message', listener);
        }
    }, [isReloadScheduled, editorStates, iframeElt, codeGenerator, hasHtml, hasCode, hasCss]);

    useEffect(() => {
        if (iframeElt && iframeRef.current !== iframeElt) {
            iframeRef.current = iframeElt;
            reload();
        }
    }, [iframeElt]);

    const applyAllChanges = useCallback(() => {
        const promises = [] as Promise<void>[];
        if (hasHtml) {
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
        if (hasCode) {
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
        if (hasCss) {
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
    }, [hasHtml, hasCode, hasCss]);

    const editorPane = useCallback((type: EditorType, language: LanguageDescription) => {
        const editorState = editorStates[type];

        const onMount: OnMount = (editor, monaco) => {
            editor.addAction({
                id: 'apply-changes',
                label: 'Apply Changes',
                keybindings: [
                    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S
                ],
                run: applyChanges
            });

            dispatchEditorsState({ target: type, type: 'initialize', value: '' });
        };

        const onChange: OnChange = (value) => {
            dispatchEditorsState({ target: type, type: 'valueChange', value: value ?? '' });
        };

        const applyChanges = () => {
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
        };

        const Icon = language.icon;

        const showKeybindingHint = !isMediumOrSmaller && editorState?.isDirty;

        return <ReflexElement minSize={40}>
            <Stack direction="row" sx={{ m: 1, height: "32px" }}>
                {Icon ? <Icon /> : undefined}
                <Typography variant="overline" sx={{ ml: 1 }}>{language.displayName}</Typography>
                {showKeybindingHint
                    ? <Typography variant="overline" sx={{ pl: 2, ml: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        Press <Key>Ctrl</Key>+<Key>S</Key> to apply changes from this pane only
                    </Typography>
                    : undefined}
                <Button sx={{ pl: 2, ml: showKeybindingHint ? undefined : "auto" }} onClick={applyChanges} disabled={!editorState?.isDirty}>
                    Apply changes
                </Button>
            </Stack>
            <Box sx={{
                height: "calc(100% - 40px)",
                ".monaco-editor .suggest-widget": { zIndex: 101 },
                ".monaco-hover": { zIndex: 102 },
            }}>
                <Editor
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
                    onChange={onChange} />
            </Box>
        </ReflexElement>;
    }, [isMediumOrSmaller, editorStates]);

    const iframe = <StretchedIFrame ref={setIframeElt} sandbox="allow-scripts" />;

    const descriptionPane = <ReflexElement minSize={40}>
        <Card sx={{ height: "100%" }}>
            <Stack direction="row" sx={{ m: 1, height: "32px" }}>
                {/* icon */}
                <Typography variant="overline" sx={{ ml: 1 }}>Instructions</Typography>
            </Stack>
            <CardContent sx={{ pt: 0 }}>
                {description}
            </CardContent>
        </Card>
    </ReflexElement>;

    const codeEditors = [
        hasHtml ? editorPane('html', htmlDescription) : undefined,
        hasHtml && (hasCode || hasCss) ? <ReflexSplitter propagate={true} /> : undefined,
        hasCode ? editorPane('code', language) : undefined,
        hasCode && hasCss ? <ReflexSplitter propagate={true} /> : undefined,
        hasCss ? editorPane('css', cssDescription) : undefined,
    ];

    const codeOnlyEditor = undefined;

    const controls = <Stack direction="row" justifyContent="end" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Tooltip title="Apply all changes">
            <IconButton onClick={applyAllChanges}><SyncIcon/></IconButton>
        </Tooltip>
        <Tooltip title="Reload">
            <IconButton onClick={reload}><RefreshIcon/></IconButton>
        </Tooltip>
        <Button variant="contained">Submit</Button>
    </Stack>;

    if (isSmallOrSmaller) {
        return <>
            {controls}
            <Card sx={{ height: "calc(100% - 36px)", flexGrow: 1, display: "flex", flexDirection: "column" }}>
                {webEditorEnabled
                    // Need to use createElement to allow spreading codeEditors to suppress React key warnings.
                    // It's not pretty, but the React team apparently refuses to budge on this.
                    // (see https://github.com/facebook/react/issues/14374 and https://github.com/facebook/react/issues/12567)
                    ? React.createElement(ReflexContainer, {},
                        descriptionPane,
                        <ReflexSplitter propagate={true} />,
                        ...codeEditors,
                        <ReflexSplitter propagate={true} />,
                        <ReflexElement>
                            <Stack direction="column" sx={{ height: "100%" }}>
                                {iframe}
                            </Stack>
                        </ReflexElement>
                    )
                    : codeOnlyEditor}
            </Card>
        </>;
    }

    

    if (isLargeOrSmaller) {
        return <ReflexContainer orientation="vertical">
            <ReflexElement minSize={40}>
                <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    {webEditorEnabled
                        // See above comment in the isSmallOrSmaller variant
                        ? React.createElement(ReflexContainer, {},
                            descriptionPane,
                            <ReflexSplitter propagate={true} />,
                            ...codeEditors
                        )
                        : codeOnlyEditor}
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

    return <ReflexContainer orientation="vertical">
        {descriptionPane}
        <ReflexSplitter propagate={true} />
        <ReflexElement minSize={40}>
            <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                {webEditorEnabled
                    // See above comment in the isSmallOrSmaller variant
                    ? React.createElement(ReflexContainer, {},
                        ...codeEditors
                    )
                    : codeOnlyEditor}
            </Card>
        </ReflexElement>
        <ReflexSplitter propagate={true} />
        <ReflexElement minSize={250}>
            <Stack direction="column" sx={{ height: "100%" }}>
                {controls}
                {iframe}
            </Stack>
        </ReflexElement>
    </ReflexContainer>;
}