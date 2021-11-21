import Editor, { OnChange, useMonaco } from "@monaco-editor/react";
import { Button, Card, CardContent, Checkbox, IconButton, Stack, styled, Tooltip, Typography, Box, ButtonBase } from "@mui/material";
import { ReflexContainer, ReflexElement, ReflexSplitter } from "react-reflex";
import useIsSizeOrSmaller from "../../hooks/ScreenSizeHook";
import { cssDescription } from "../../languages/css";
import { htmlDescription } from "../../languages/html";
import LanguageDescription from "../../languages/LangaugeDescription";
import { ActivityConfigPageProps, ActivityPageProps } from "../ActivityDescription";
import { Refresh as RefreshIcon, Sync as SyncIcon } from "@mui/icons-material";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import React from "react";
import useCodeGenerator from "../../hooks/CodeGeneratorHook";
import supportsAmbient from "../../languages/features/supportsAmbient";
import supportsIsolated from "../../languages/features/supportsIsolated";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import TypescriptIcon from "../../util/icons/TypescriptIcon";
import testScaffoldingTypes from "raw-loader!./test-scaffolding.d.ts.raw";
import transformTestScaffolding from "../../languages/transformers/babel-plugin-transform-test-scaffolding";
import { Typescript } from "../../languages/typescript";
import CodeAlert from "../../components/CodeAlert";
import useImperativeDialog from "../../hooks/ImperativeDialogHook";
import TestsDialog from "./TestsDialog";
import { editorStateReducer, EditorType } from "./editorStateReducer";
import PaneEditor from "./PaneEditor";
import Key from "../../components/Key";
import { ActivityIframe, RunTestsCallback } from "./ActivityIframe";
import alpha from "color-alpha";
import Lazy from "../../components/Lazy";

export interface TestActivityConfig {
    description: string;
    hiddenHtml: string;
    tests: string;
    languages: {
        html: { enabled: boolean, defaultValue: string };
        code: { enabled: boolean, defaultValue: { [languageName: string]: string } };
        css: { enabled: boolean, defaultValue: string };
    }
}

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
            hiddenHtml,
            languages: {
                html,
                code,
                css
            }
        } = activityConfig;

        const isSmallOrSmaller = useIsSizeOrSmaller("sm");
        const isMediumOrSmaller = useIsSizeOrSmaller("md");
        const isLargeOrSmaller = useIsSizeOrSmaller("lg");
        
        const [editorStates, dispatchEditorsState] = useReducer(editorStateReducer, {});

        const reloadRef = useRef<() => Promise<void>>();
        const runTestsRef = useRef<RunTestsCallback>();

        const applyChanges = useCallback((type: EditorType) => {
            dispatchEditorsState({
                target: type,
                type: 'applyChanges'
            });
        }, []);

        const startTests = useRef(() => {});
        const passTests = useRef(() => {});
        const failTests = useRef((_: string) => {});

        const [testsDialog, openTestsDialog] = useImperativeDialog(TestsDialog, {
            startRunningRef: f => startTests.current = f,
            successRef: f => passTests.current = f,
            failureRef: f => failTests.current = f,
        });

        const applyAllChanges = useCallback(() => {
            if (html.enabled) {
                dispatchEditorsState({
                    target: 'html',
                    type: 'applyChanges'
                });
            }
            if (code.enabled) {
                dispatchEditorsState({
                    target: 'code',
                    type: 'applyChanges'
                });
            }
            if (css.enabled) {
                dispatchEditorsState({
                    target: 'css',
                    type: 'applyChanges'
                });
            }
        }, [html.enabled, code.enabled, css.enabled]);

        const codeGenerator = useCodeGenerator<[typeof supportsAmbient, typeof supportsIsolated]>(language.name);
        const [compiledJs, setCompiledJs] = useState('');
        const codeSource = editorStates.code?.value;

        useEffect(() => {
            if (codeSource !== undefined) {
                try {
                    const compiledJs = codeGenerator.toRunnerCode(codeSource, {
                        ambient: true,
                        isolated: true
                    });
                    setCompiledJs(compiledJs);
                }
                catch (e) {
                    console.error(e);
                    setCompiledJs('// compilation error');
                }
            }
        }, [codeSource, codeGenerator]);

        const [isHiddenHtmlTabActive, setHiddenHtmlTabActive] = useState(false);

        const editorPane = useCallback((type: EditorType, language: LanguageDescription) => {
            const editorState = editorStates[type];

            const onEditorContainerRef = (elt: HTMLDivElement) => {
                if (elt) {
                    if (!editorState) {
                        if (type === 'code') {
                            dispatchEditorsState({ target: type, type: 'initialize', value: activityConfig.languages.code.defaultValue![language.name] });
                        }
                        else if (type === 'hidden-html') {
                            dispatchEditorsState({ target: type, type: 'initialize', value: activityConfig.hiddenHtml });
                        }
                        else {
                            dispatchEditorsState({ target: type, type: 'initialize', value: activityConfig.languages[type].defaultValue! });
                        }
                    }
                }
            }

            const Icon = language.icon;

            const showKeybindingHint = !isMediumOrSmaller && editorState?.isDirty;

            let toolbarItems: JSX.Element;
            let tabItems: JSX.Element | undefined = undefined;

            if (isEditor) {
                toolbarItems = <>
                    {Icon ? <Icon /> : undefined}
                    <Typography variant="overline" sx={{ mx: 1, flexGrow: 1 }}>{language.displayName}</Typography>
                </>;

                function tab(title: string, hasCheckbox: boolean, active: boolean, onClick?: () => void) {
                    const content = <>
                        <Typography variant="overline" sx={{
                            userSelect: "none",
                            mx: 1,
                            color: active ? undefined : ({palette}) => palette.text.disabled
                        }}>
                            {title}
                        </Typography>
                        {hasCheckbox
                            ? <Checkbox sx={{ ml: "-9px", my: "-9px" }}
                                checked={activityConfig.languages[type as Exclude<EditorType, 'hidden-html'>].enabled}
                                disabled={!active}
                                onChange={ev => onActivityConfigChange!({
                                    ...activityConfig,
                                    languages: {
                                        ...activityConfig.languages,
                                        [type]: {
                                            ...activityConfig.languages[type as Exclude<EditorType, 'hidden-html'>],
                                            enabled: ev.target.checked
                                        }
                                    }
                                })} />
                            : undefined}
                    </>;

                    if (onClick) {
                        return <ButtonBase onClick={onClick} sx={({palette}) => ({
                            flexShrink: 0,
                            borderRadius: "0 0 4px 4px",
                            mb: 1,
                            pt: 1,
                            backgroundColor: active ? undefined : palette.background.default,
                            border: `1px solid ${active ? 'transparent' : palette.divider}`,
                            borderTop: '1px solid transparent',
                            cursor: "pointer",
                            "&:hover": {
                                backgroundColor: palette.action.hover
                            }
                        })}>
                            {content}
                        </ButtonBase>;
                    }
                    else {
                        return <Box sx={{
                            flexShrink: 0,
                            borderRadius: "0 0 4px 4px",
                            mb: 1,
                            pt: 1
                        }}>
                            {content}
                        </Box>;
                    }
                }

                if (type === 'html') {
                    tabItems = <>
                        {tab('hidden', false, isHiddenHtmlTabActive, () => setHiddenHtmlTabActive(true))}
                        {tab('starter', true, !isHiddenHtmlTabActive, () => setHiddenHtmlTabActive(false))}
                    </>;
                }
                else if (type === 'hidden-html') {
                    tabItems = tab('hidden', false, true);
                }
                else {
                    tabItems = tab('starter', true, true);
                }
            }
            else {
                toolbarItems = <>
                    {Icon ? <Icon /> : undefined}
                    <Typography variant="overline" sx={{ ml: 1 }}>{language.displayName}</Typography>
                    {showKeybindingHint
                        ? <Typography variant="overline" sx={{ pl: 2, ml: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            Press <Key>Ctrl</Key>+<Key>S</Key> to apply changes
                        </Typography> : undefined}
                    <Button size="small" onClick={() => applyChanges(type)} disabled={!editorState?.isDirty}
                        sx={{ ml: showKeybindingHint ? 0.5 : "auto", flexShrink: 0 }}>
                        Apply changes
                    </Button>
                </>;
            }

            const realType = type;
            const practicalType = realType === 'hidden-html' || (realType === 'html' && isHiddenHtmlTabActive)
                ? 'hidden-html'
                : realType;

            const editorValue = isEditor
                ? practicalType === 'code'
                    ? activityConfig.languages.code.defaultValue![language.name] ?? ''
                    : practicalType === 'hidden-html'
                    ? activityConfig.hiddenHtml
                    : activityConfig.languages[practicalType].defaultValue
                : editorState?.uncommittedValue;

            const onChange: OnChange = value => {
                if (isEditor) {
                    if (practicalType === 'hidden-html') {
                        onActivityConfigChange!({
                            ...activityConfig,
                            hiddenHtml: value ?? ''
                        });
                    }
                    else {
                        onActivityConfigChange!({
                            ...activityConfig,
                            languages: {
                                ...activityConfig.languages,
                                [practicalType]: {
                                    ...activityConfig.languages[practicalType],
                                    defaultValue: practicalType === "code"
                                        ? {
                                            ...activityConfig.languages.code.defaultValue ?? {},
                                            [language.name]: value
                                        }
                                        : value
                                }
                            }
                        });
                    }
                }
                else {
                    dispatchEditorsState({ target: practicalType, type: 'valueChange', value: value ?? '' });
                }
            }

            let editor: JSX.Element;

            if (realType === 'html') {
                editor = <>
                    <Lazy show={isHiddenHtmlTabActive}>
                        <PaneEditor
                            isConfig={isEditor}
                            language={htmlDescription}
                            value={editorValue}
                            applyChanges={() => applyChanges('hidden-html')}
                            onChange={onChange} />
                    </Lazy>
                    <Lazy show={!isHiddenHtmlTabActive}>
                        <PaneEditor
                            isConfig={isEditor}
                            language={language}
                            value={editorValue}
                            applyChanges={() => applyChanges(practicalType)}
                            onChange={onChange} />
                    </Lazy>
                </>;
            }
            else {
                editor = <PaneEditor
                    isConfig={isEditor}
                    language={language}
                    value={editorValue}
                    applyChanges={() => applyChanges(practicalType)}
                    onChange={onChange} />;
            }

            return <ReflexElement key={language.name} minSize={40}>
                <Stack direction="column" sx={{ height: "100%" }}>
                    <Stack direction="row">
                        <Stack direction="row" alignItems="center" sx={{ m: 1, flexGrow: 1, height: "24px" }}>{toolbarItems}</Stack>
                        {tabItems ? <Stack direction="row" alignItems="center" sx={{ height: "40px" }}>{tabItems}</Stack> : undefined}
                    </Stack>
                    <Box ref={onEditorContainerRef} sx={{
                        flexGrow: 1,
                        height: "calc(100% - 40px)", // need this because monaco does weird things withou it.
                        ".monaco-editor .suggest-widget": { zIndex: 101 },
                        ".monaco-hover": { zIndex: 102 },
                    }}>
                        {editor}
                    </Box>
                </Stack>
            </ReflexElement>;
        }, [isHiddenHtmlTabActive, isMediumOrSmaller, editorStates, applyChanges, activityConfig, onActivityConfigChange]);

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
            iframeOrTestPane
                = <ActivityIframe
                    htmlTemplate={hiddenHtml}
                    html={html.enabled ? editorStates.html?.value : undefined}
                    js={code.enabled ? compiledJs : undefined}
                    css={css.enabled ? editorStates.css?.value : undefined}
                    reloadRef={reloadRef}
                    runTestsRef={runTestsRef}
                    sx={{
                        width: "100%",
                        flexGrow: 1,
                        border: "none",
                        borderRadius: "4px"
                    }} />;
        }

        function runTests() {
            if (runTestsRef.current) {
                openTestsDialog();
                runTestsRef.current(
                    tests,
                    startTests.current,
                    msg => {
                        if (msg) {
                            failTests.current(msg);
                        }
                        else {
                            passTests.current();
                        }
                    }
                );
            }
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
                            <ReactMarkdown
                                rehypePlugins={[rehypeHighlight]}
                                remarkPlugins={[remarkGfm]}
                                linkTarget="_blank">{description}</ReactMarkdown>
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
                <IconButton onClick={reloadRef.current}><RefreshIcon/></IconButton>
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
