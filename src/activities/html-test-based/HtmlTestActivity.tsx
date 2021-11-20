import Editor, { OnChange, useMonaco } from "@monaco-editor/react";
import { Button, Card, CardContent, Checkbox, IconButton, Stack, styled, Tooltip, Typography } from "@mui/material";
import { ReflexContainer, ReflexElement, ReflexSplitter } from "react-reflex";
import useIsSizeOrSmaller from "../../hooks/ScreenSizeHook";
import { cssDescription } from "../../languages/css";
import { htmlDescription } from "../../languages/html";
import LanguageDescription from "../../languages/LangaugeDescription";
import { ActivityConfigPageProps, ActivityPageProps } from "../ActivityDescription";
import { Refresh as RefreshIcon, Sync as SyncIcon } from "@mui/icons-material";
import { Box } from "@mui/system";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import React from "react";
import iframeHtml from "raw-loader!./iframe.html";
import { nanoid } from "nanoid";
import useCodeGenerator from "../../hooks/CodeGeneratorHook";
import { $void } from "../../util/fp";
import supportsAmbient from "../../languages/features/supportsAmbient";
import supportsIsolated from "../../languages/features/supportsIsolated";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import TypescriptIcon from "../../util/icons/TypescriptIcon";
import testScaffoldingTypes from "raw-loader!./test-scaffolding.d.ts.raw";
import testScaffoldingImpl from "raw-loader!./test-scaffolding-impl.js.raw";
import transformTestScaffolding from "../../languages/transformers/babel-plugin-transform-test-scaffolding";
import { Typescript } from "../../languages/typescript";
import CodeAlert from "../../components/CodeAlert";
import useImperativeDialog from "../../hooks/ImperativeDialogHook";
import TestsDialog from "./TestsDialog";
import { editorStateReducer, EditorType } from "./editorStateReducer";
import PaneEditor from "./PaneEditor";
import Key from "../../components/Key";

type OptionalConfig<T>
    = { enabled: true } & T
    | { enabled: false } & Partial<T>;

export interface TestActivityConfig {
    description: string;
    tests: string;
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

export interface HtmlTestActivityMetaProps {
    isEditor: boolean;
}

function createTestActivityPage({ isEditor }: HtmlTestActivityMetaProps) {
    return function (props: ActivityConfigPageProps<TestActivityConfig> | ActivityPageProps<TestActivityConfig>) {
        const {
            language,
            activityConfig,
            onActivityConfigChange
        } = props as (typeof props) & Partial<ActivityConfigPageProps<TestActivityConfig> & ActivityPageProps<TestActivityConfig>>;

        const {
            description,
            tests,
            html,
            code,
            css
        } = activityConfig;

        const isSmallOrSmaller = useIsSizeOrSmaller("sm");
        const isMediumOrSmaller = useIsSizeOrSmaller("md");
        const isLargeOrSmaller = useIsSizeOrSmaller("lg");
        
        const codeGenerator = useCodeGenerator<[typeof supportsAmbient, typeof supportsIsolated]>(language.name);
        
        const [editorStates, dispatchEditorsState] = useReducer(editorStateReducer, {});

        const applyChangesRef = useRef<(type: EditorType, value: string) => void>(() => {});
        const applyChanges = useCallback((type: EditorType) => {
            if (activityConfig[type].enabled) {
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
            }
        }, [activityConfig]);

        const startTests = useRef(() => {});
        const passTests = useRef(() => {});
        const failTests = useRef((_: string) => {});

        const [testsDialog, openTestsDialog] = useImperativeDialog(TestsDialog, {
            startRunningRef: f => startTests.current = f,
            successRef: f => passTests.current = f,
            failureRef: f => failTests.current = f,
        });

        const [isRunningTests, setIsRunningTests] = useState(false);

        function runTests() {
            openTestsDialog();
            setIsRunningTests(true);
            reload();
        }

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
                                try {
                                    value = codeGenerator.toRunnerCode(value, { ambient: true, isolated: true });
                                }
                                catch (e) {
                                    console.error(e);
                                    value = '// Code failed to compile';
                                }
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

                        if (isRunningTests) {
                            try {
                                const code = testScaffoldingImpl + new Typescript().toRunnerCode(tests, {
                                    ambient: true,
                                    isolated: true,
                                    babelPlugins: [transformTestScaffolding]
                                });

                                iframeElt.contentWindow!.postMessage({ type: 'tests', signature, code }, '*');

                                startTests.current();
                                let finished = false;

                                const testResultsListener = (ev: MessageEvent<any>) => {
                                    if (ev.data?.signature === signature && ev.data.type === 'test-results') {
                                        window.removeEventListener('message', testResultsListener);
                                        finished = true;
                                        console.log(ev.data.success ? 'Passed all tests' : 'Failed test');
                                        if (ev.data.success) {
                                            passTests.current();
                                        }
                                        else {
                                            console.log(ev.data.message);
                                            failTests.current(ev.data.message);
                                        }
                                        setIsRunningTests(false);
                                        reload();
                                    }
                                }

                                window.addEventListener('message', testResultsListener);
                                setTimeout(() => {
                                    if (!finished) {
                                        window.removeEventListener('message', testResultsListener);
                                        setIsRunningTests(false);
                                        failTests.current('Tests timed out');
                                        console.log('Tests timed out');
                                        reload();
                                    }
                                }, 10000);
                            }
                            catch (e) {
                                console.log(e);
                            }
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
        }, [isReloadScheduled, editorStates, iframeElt, codeGenerator, html.enabled, code.enabled, css.enabled, tests, isRunningTests]);

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
                    if (!editorState) {
                        if (type === 'code') {
                            dispatchEditorsState({ target: type, type: 'initialize', value: activityConfig.code.defaultValue![language.name] });
                        }
                        else {
                            dispatchEditorsState({ target: type, type: 'initialize', value: activityConfig[type].defaultValue! });
                        }
                    }
                }
            }

            const Icon = language.icon;

            const showKeybindingHint = !isMediumOrSmaller && editorState?.isDirty;

            let toolbarItems = [] as (JSX.Element | undefined)[];

            if (isEditor) {
                toolbarItems.push(
                    <Checkbox sx={{ m: "-9px", mr: 0 }}
                        checked={activityConfig[type].enabled}
                        onChange={ev => onActivityConfigChange!({
                            ...activityConfig,
                            [type]: {
                                ...activityConfig[type],
                                enabled: ev.target.checked
                            }
                        })} />,
                    Icon ? <Icon /> : undefined,
                    <Typography variant="overline" sx={{ ml: 1 }}>{language.displayName}</Typography>
                );
            }
            else {
                toolbarItems.push(
                    Icon ? <Icon /> : undefined,
                    <Typography variant="overline" sx={{ ml: 1 }}>{language.displayName}</Typography>,
                    showKeybindingHint
                        ? <Typography variant="overline" sx={{ pl: 2, ml: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            Press <Key>Ctrl</Key>+<Key>S</Key> to apply changes
                        </Typography> : undefined,
                    <Button onClick={() => applyChanges(type)} disabled={!editorState?.isDirty}
                        sx={{ ml: showKeybindingHint ? undefined : "auto", flexShrink: 0 }}>
                        Apply changes
                    </Button>
                );
            }

            const editorValue = isEditor
                ? type === "code" ? activityConfig.code.defaultValue![language.name] ?? "" : activityConfig[type].defaultValue
                : editorState?.uncommittedValue;

            const onChange: OnChange = value => {
                if (isEditor) {
                    onActivityConfigChange!({
                        ...activityConfig,
                        [type]: {
                            ...activityConfig[type],
                            defaultValue: type === "code"
                                ? {
                                    ...activityConfig.code.defaultValue ?? {},
                                    [language.name]: value
                                }
                                : value
                        }
                    });
                }
                else {
                    dispatchEditorsState({ target: type, type: 'valueChange', value: value ?? '' });
                }
            }

            return <ReflexElement key={language.name} minSize={40}>
                <Stack direction="column" sx={{ height: "100%" }}>
                    <Stack direction="row" sx={{ m: 1, height: "24px" }}>{toolbarItems}</Stack>
                    <Box ref={onEditorContainerRef} sx={{
                        flexGrow: 1,
                        height: "calc(100% - 40px)", // need this because monaco does weird things withou it.
                        ".monaco-editor .suggest-widget": { zIndex: 101 },
                        ".monaco-hover": { zIndex: 102 },
                    }}>
                        <PaneEditor
                            isConfig={isEditor as true | false}
                            language={language}
                            value={editorValue}
                            applyChanges={() => applyChanges(type)}
                            onChange={onChange} />
                    </Box>
                </Stack>
            </ReflexElement>;
        }, [isMediumOrSmaller, editorStates, applyChanges, activityConfig, onActivityConfigChange]);

        const monaco = useMonaco();

        useEffect(() => {
            if (monaco && isEditor) {
                const lib = monaco.languages.typescript.typescriptDefaults.addExtraLib(
                    testScaffoldingTypes,
                    "test-scaffolding.d.ts"
                );
        
                return () => lib.dispose();
            }
        }, [monaco]);

        const [testsCompileError, setTestsCompileError] = useState<Error | undefined>();

        useEffect(() => {
            if (isEditor) {
                try {
                    new Typescript().toRunnerCode(tests, {
                        ambient: true,
                        isolated: true,
                        throwAllCompilerErrors: true,
                        babelPlugins: [transformTestScaffolding]
                    });
                    setTestsCompileError(undefined);
                }
                catch (e) {
                    if (e instanceof Error) {
                        if (e.message.startsWith('unknown: ')) {
                            e.message = e.message.slice(9);
                        }
                        setTestsCompileError(e);
                    }
                    else {
                        setTestsCompileError(new Error(`${e}`));
                    }
                }
            }
        }, [tests]);

        let iframeOrTestPane: JSX.Element;

        if (isEditor) {
            iframeOrTestPane = <Card sx={{ height: "100%" }}>
                <Stack direction="column" sx={{ height: "100%" }}>
                    <Stack direction="row" sx={{ m: 1, height: "24px" }}>
                        <TypescriptIcon />
                        <Typography variant="overline" sx={{ ml: 1 }}>Tests</Typography>
                    </Stack>
                    <Box sx={{
                        overflow: "hidden",
                        flexGrow: 1
                    }}>
                        <Editor
                            theme="vs-dark"
                            options={{
                                minimap: { enabled: false },
                                "semanticHighlighting.enabled": true,
                                automaticLayout: true,
                                fixedOverflowWidgets: true,
                            }}
                            language="typescript"
                            value={tests}
                            onChange={val => onActivityConfigChange!({
                                ...activityConfig,
                                tests: val ?? ""
                            })} />
                    </Box>
                    <CodeAlert error={testsCompileError} successMessage="Your tests compiled successfully!" />
                </Stack>
            </Card>
        }
        else {
            iframeOrTestPane = <StretchedIFrame ref={setIframeElt} sandbox="allow-scripts" />;
        }

        const descriptionPane = <ReflexElement minSize={40} flex={!isLargeOrSmaller ? 2 : undefined}>
            <Card sx={{ height: "100%" }}>
                <Stack direction="column" sx={{ height: "100%" }}>
                    <Stack direction="row" sx={{ m: 1, height: "24px" }}>
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
                                wordWrap: "on",
                            }}
                            language="markdown"
                            value={description}
                            onChange={val => onActivityConfigChange!({
                                ...activityConfig,
                                description: val ?? ""
                            })} />
                        : <CardContent sx={{ pt: 0, flexGrow: 1, overflow: "auto" }}>
                            <ReactMarkdown rehypePlugins={[rehypeHighlight]} remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
                        </CardContent>}
                </Stack>
            </Card>
        </ReflexElement>;

        const codeEditors = [
            isEditor || html.enabled ? editorPane('html', htmlDescription) : undefined,
            isEditor || html.enabled && (code.enabled || css.enabled) ? <ReflexSplitter propagate={true} /> : undefined,
            isEditor || code.enabled ? editorPane('code', language) : undefined,
            isEditor || code.enabled && css.enabled ? <ReflexSplitter propagate={true} /> : undefined,
            isEditor || css.enabled ? editorPane('css', cssDescription) : undefined,
        ];

        const controls = isEditor ? null : <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: "6px" }}>
            <Button variant="contained" onClick={runTests}>Run tests</Button>
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title="Apply all changes">
                <IconButton onClick={applyAllChanges}><SyncIcon/></IconButton>
            </Tooltip>
            <Tooltip title="Reload">
                <IconButton onClick={reload}><RefreshIcon/></IconButton>
            </Tooltip>
        </Stack>;

        let layout: JSX.Element;

        if (isSmallOrSmaller) {
            layout = <>
                {controls}
                <Card sx={{ height: "calc(100% - 36px)", flexGrow: 1, display: "flex", flexDirection: "column" }}>
                    {/* Need to use React.createElement because of limitations in
                        the Re-Flex used for having draggable panes */}
                    {React.createElement(ReflexContainer, {},
                        descriptionPane,
                        <ReflexSplitter propagate={true} />,
                        ...codeEditors,
                        <ReflexSplitter propagate={true} />,
                        <ReflexElement>
                            <Stack direction="column" sx={{ height: "100%" }}>
                                {iframeOrTestPane}
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
                        {React.createElement(ReflexContainer, {},
                            descriptionPane,
                            <ReflexSplitter propagate={true} />,
                            ...codeEditors
                        )}
                    </Card>
                </ReflexElement>
                <ReflexSplitter/>
                <ReflexElement minSize={isEditor ? 40 : 250}>
                    <Stack direction="column" sx={{ height: "100%" }}>
                        {controls}
                        {iframeOrTestPane}
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
                        {React.createElement(ReflexContainer, {}, ...codeEditors)}
                    </Card>
                </ReflexElement>
                <ReflexSplitter propagate={true} />
                <ReflexElement minSize={isEditor ? 40 : 250} flex={2}>
                    <Stack direction="column" sx={{ height: "100%" }}>
                        {controls}
                        {iframeOrTestPane}
                    </Stack>
                </ReflexElement>
            </ReflexContainer>;
        }

        return <>
            {testsDialog}
            {layout}
        </>;
    }
}

export const TestActivity = createTestActivityPage({ isEditor: false });
export const TestActivityConfigPage = createTestActivityPage({ isEditor: true });
