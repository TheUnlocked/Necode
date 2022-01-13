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
import supportsGlobal from "../../languages/features/supportsGlobal";
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
import Lazy from "../../components/Lazy";
import { useSnackbar } from "notistack";
import { useLoadingContext } from "../../api/client/LoadingContext";
import { debounce } from "lodash";
import { ImplicitNewType, NonStrictDisjunction } from "../../util/types";

export interface HtmlTestActivityBaseConfig {
    description?: string;
    hiddenHtml?: string;
    tests?: {
        source: string,
        mustPassToSubmit: boolean
    };
    languages: {
        html?: { enabled: boolean, defaultValue: string };
        code?: { enabled: boolean, defaultValue: { [languageName: string]: string } };
        css?: { enabled: boolean, defaultValue: string };
    }
}

type URLString = ImplicitNewType<string, 'URLString'>;

export interface HtmlTestActivityOptions {
    hasTests?: boolean;
    hasHtml?: boolean;
    hasCss?: boolean;
    hasCode?: boolean;
    hiddenHtml?: { configurable: true } | { configurable: false, value?: string };

    typeDeclarations?: string | URLString[];
} 

interface HtmlTestActivityMetaProps {
    isEditor: boolean;
    options: HtmlTestActivityOptions;
}

export function createTestActivityPage({
    isEditor,
    options: {
        hasTests: activityTypeHasTests = true,
        hasHtml: activityTypeHasHtml = true,
        hasCss: activityTypeHasCss = true,
        hasCode: activityTypeHasCode = true,
        hiddenHtml: activityTypeHiddenHtml = { configurable: true },
        typeDeclarations: typeDeclarationsSource
    }
}: HtmlTestActivityMetaProps) {
    const hasTypeDeclarations = Boolean(typeDeclarationsSource);

    return function <Config extends HtmlTestActivityBaseConfig>(props: ActivityConfigPageProps<Config> | ActivityPageProps<Config>) {
        const {
            language,
            activityConfig,
            onActivityConfigChange,
            socketInfo,
            saveData,
            onSaveDataChange
        } = props as NonStrictDisjunction<ActivityConfigPageProps<Config>, ActivityPageProps<Config>>;

        const {
            description,
            tests: {
                source: testsSource,
                mustPassToSubmit
            } = {},
            hiddenHtml,
            languages: {
                html,
                code,
                css
            }
        } = activityConfig;

        const isHtmlEnabled = activityTypeHasHtml && (isEditor || html?.enabled);
        const isCodeEnabled = activityTypeHasCode && (isEditor || code?.enabled);
        const isCssEnabled = activityTypeHasCss && (isEditor || css?.enabled);

        const showIframeTestPane = !isEditor || activityTypeHasTests;

        const isSmallLayout = useIsSizeOrSmaller("sm");
        const isThinner = useIsSizeOrSmaller("md");
        const isMediumLayout = useIsSizeOrSmaller("lg") && showIframeTestPane;
        
        const [editorStates, dispatchEditorsState] = useReducer(editorStateReducer, {});

        useEffect(() => {
            if (saveData) {
                dispatchEditorsState({ type: 'valueChange', target: 'html', value: saveData.data?.html });
                dispatchEditorsState({ type: 'valueChange', target: 'code', value: saveData.data?.code });
                dispatchEditorsState({ type: 'valueChange', target: 'css', value: saveData.data?.css });
                onSaveDataChange?.(undefined);
            }
        }, [saveData, onSaveDataChange]);

        const reloadRef = useRef<() => Promise<void>>();
        const runTestsRef = useRef<RunTestsCallback>();

        const applyChanges = useCallback((type: EditorType) => {
            dispatchEditorsState({
                target: type,
                type: 'applyChanges'
            });
        }, []);

        const { enqueueSnackbar } = useSnackbar();
        const { startUpload, finishUpload } = useLoadingContext();

        const startTests = useRef(() => {});
        const passTests = useRef(() => {});
        const failTests = useRef((_: string) => {});

        function makeSubmission() {
            if (!socketInfo?.socket) {
                enqueueSnackbar('A network error occurrred. Copy your work to a safe place and refresh the page.', { variant: 'error' });
                return;
            }
            startUpload();
            socketInfo.socket.emit('submission', {
                html: editorStates.html?.value,
                code: editorStates.code?.value,
                css: editorStates.css?.value
            }, error => {
                finishUpload();
                if (error) {
                    enqueueSnackbar(error, { variant: 'error' });
                }
                else {
                    closeTestsDialog();
                }
            });
        }

        const [testsDialog, openTestsDialog, closeTestsDialog] = useImperativeDialog(TestsDialog, {
            mustPassToSubmit,
            startRunningRef: f => startTests.current = f,
            successRef: f => passTests.current = f,
            failureRef: f => failTests.current = f,
            onSubmit: makeSubmission
        });

        const applyAllChanges = useCallback(() => {
            if (isHtmlEnabled) {
                dispatchEditorsState({
                    target: 'html',
                    type: 'applyChanges'
                });
            }
            if (isCodeEnabled) {
                dispatchEditorsState({
                    target: 'code',
                    type: 'applyChanges'
                });
            }
            if (isCssEnabled) {
                dispatchEditorsState({
                    target: 'css',
                    type: 'applyChanges'
                });
            }
        }, [isHtmlEnabled, isCodeEnabled, isCssEnabled]);

        const codeGenerator = useCodeGenerator<[typeof supportsGlobal, typeof supportsIsolated]>(language.name);
        const [compiledJs, setCompiledJs] = useState('');
        const codeSource = editorStates.code?.value;

        useEffect(() => {
            if (codeSource !== undefined) {
                try {
                    const compiledJs = codeGenerator.toRunnerCode(codeSource, {
                        global: true,
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

        const [isHiddenHtmlTabActive, setHiddenHtmlTabActive] = useState(!activityTypeHasHtml);

        const editorPane = useCallback((type: EditorType, language: LanguageDescription) => {
            const isHiddenHtmlOnly = type === 'html' && !activityTypeHasHtml;
            const editorState = editorStates[type];

            const onEditorContainerRef = (elt: HTMLDivElement) => {
                if (elt && !isEditor && !editorState) {
                    if (type === 'code') {
                        dispatchEditorsState({ target: type, type: 'initialize', value: activityConfig.languages.code!.defaultValue![language.name] });
                    }
                    else {
                        dispatchEditorsState({ target: type, type: 'initialize', value: activityConfig.languages[type]!.defaultValue! });
                    }
                }
            }

            const Icon = language.icon;

            const showKeybindingHint = !isThinner && editorState?.isDirty;

            let toolbarItems: JSX.Element;
            let tabItems: JSX.Element | undefined = undefined;

            if (isEditor) {
                toolbarItems = <>
                    {Icon ? <Icon /> : undefined}
                    <Typography variant="overline" sx={{ mx: 1, flexGrow: 1 }}>{language.displayName}</Typography>
                </>;

                function tab(title: string, hasCheckbox: boolean, active: boolean, onClick?: () => void) {
                    const langConfig = activityConfig.languages[type as Exclude<EditorType, 'hidden-html'>];
                    const content = <>
                        <Typography variant="overline" sx={{
                            userSelect: onClick ? "none" : undefined,
                            mx: 1,
                            color: active ? undefined : ({palette}) => palette.text.disabled
                        }}>
                            {title}
                        </Typography>
                        {hasCheckbox
                            ? <Checkbox sx={{ ml: "-9px", my: "-9px" }}
                                checked={langConfig!.enabled}
                                disabled={!active}
                                onChange={ev => ev.target.checked === langConfig!.enabled ? undefined : onActivityConfigChange!({
                                    ...activityConfig,
                                    languages: {
                                        ...activityConfig.languages,
                                        [type]: {
                                            ...langConfig,
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
                    if (isHiddenHtmlOnly) {
                        tabItems = tab('hidden', false, true);
                    }
                    else {
                        tabItems = <>
                            {tab('hidden', false, isHiddenHtmlTabActive, () => setHiddenHtmlTabActive(true))}
                            {tab('starter', true, !isHiddenHtmlTabActive, () => setHiddenHtmlTabActive(false))}
                        </>;
                    }
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

            const editorValue = isEditor
                ? isHiddenHtmlOnly
                    ? ''
                : type === 'code'
                    ? activityConfig.languages.code!.defaultValue![language.name] ?? ''
                    : activityConfig.languages[type]!.defaultValue
                : editorState?.uncommittedValue;

            const onHiddenHtmlChange: OnChange = value => {
                if (activityConfig.hiddenHtml !== value) {
                    onActivityConfigChange!({
                        ...activityConfig,
                        hiddenHtml: value ?? ''
                    });
                }
            };

            const onChange: OnChange = value => {
                if (isEditor) {
                    if (editorValue !== value) {
                        onActivityConfigChange!({
                            ...activityConfig,
                            languages: {
                                ...activityConfig.languages,
                                [type]: {
                                    ...activityConfig.languages[type],
                                    defaultValue: type === "code"
                                        ? {
                                            ...activityConfig.languages.code!.defaultValue ?? {},
                                            [language.name]: value
                                        }
                                        : value
                                }
                            }
                        });
                    }
                }
                else {
                    dispatchEditorsState({ target: type, type: 'valueChange', value: value ?? '' });
                }
            }

            let editor: JSX.Element;

            if (isHiddenHtmlOnly) {
                editor = <PaneEditor
                    isConfig={true}
                    language={htmlDescription}
                    value={activityConfig.hiddenHtml}
                    onChange={onHiddenHtmlChange} />
            }
            else if (isEditor && type === 'html') {
                // Want to load both editors to preserve scroll.
                // Plus it simplifies some of the logic.
                editor = <>
                    <Lazy show={isHiddenHtmlTabActive}>
                        <PaneEditor
                            isConfig={true}
                            language={htmlDescription}
                            value={activityConfig.hiddenHtml}
                            onChange={onHiddenHtmlChange} />
                    </Lazy>
                    <Lazy show={!isHiddenHtmlTabActive}>
                        <PaneEditor
                            isConfig={true}
                            language={language}
                            value={editorValue}
                            onChange={onChange} />
                    </Lazy>
                </>;
            }
            else {
                editor = <PaneEditor
                    isConfig={isEditor}
                    language={language}
                    value={editorValue}
                    applyChanges={() => applyChanges(type)}
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
                        height: "calc(100% - 40px)", // need this because monaco does weird things without it.
                        ".monaco-editor .suggest-widget": { zIndex: 101 },
                        ".monaco-hover": { zIndex: 102 },
                    }}>
                        {editor}
                    </Box>
                </Stack>
            </ReflexElement>;
        }, [isHiddenHtmlTabActive, isThinner, editorStates, applyChanges, activityConfig, onActivityConfigChange]);

        const monaco = useMonaco();

        const [typeDeclarationFiles, setTypeDeclarationFiles] = useState<{ content: string, filePath?: string }[]>();

        if (typeDeclarationsSource && typeDeclarationFiles === undefined) {
            if (typeof typeDeclarationsSource === 'string') {
                setTypeDeclarationFiles([{
                    content: typeDeclarationsSource,
                    filePath: 'activity-declarations.d.ts'
                }]);
            }
            else {
                setTypeDeclarationFiles(x => x ?? []);
                Promise.allSettled(typeDeclarationsSource.map(url => fetch(url as string).then(x => x.text()).then(x => [x, url as string])))
                    .then(results => results
                        .filter((x): x is PromiseFulfilledResult<[string, string]> => x.status === 'fulfilled')
                        .map(x => x.value)
                        .map(([ content, filePath ]) => ({ content, filePath })))
                    .then(setTypeDeclarationFiles);
            }
        }

        useEffect(() => {
            if (monaco) {
                monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
                    ...monaco.languages.typescript.javascriptDefaults.getCompilerOptions(),
                    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs
                });
                monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
                    ...monaco.languages.typescript.typescriptDefaults.getCompilerOptions(),
                    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs
                });

                const tsLibs = [] as { content: string, filePath?: string }[];
                const jsLibs = [] as { content: string, filePath?: string }[];

                if (isEditor && activityTypeHasTests) {
                    tsLibs.push({
                        content: testScaffoldingTypes,
                        filePath: 'test-scaffolding.d.ts'
                    });
                }
                if (hasTypeDeclarations && typeDeclarationFiles) {
                    jsLibs.push(...typeDeclarationFiles);
                    tsLibs.push(...typeDeclarationFiles);
                }
                
                if (jsLibs.length > 0) monaco.languages.typescript.javascriptDefaults.setExtraLibs(jsLibs);
                if (tsLibs.length > 0) monaco.languages.typescript.typescriptDefaults.setExtraLibs(tsLibs);
            }
        }, [monaco, typeDeclarationFiles]);

        const [testsCompileError, setTestsCompileError] = useState<Error | undefined>();

        // Be very careful when editing this function, since exaustive-deps is disabled.
        // eslint-disable-next-line @grncdr/react-hooks/exhaustive-deps
        const validateTests = useCallback(debounce((tests: string) => {
            try {
                new Typescript().toRunnerCode(tests, {
                    global: true,
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
        }, 300), []);

        useEffect(() => {
            if (isEditor && testsSource !== undefined) {
                validateTests(testsSource);
            }
        }, [testsSource, validateTests]);

        let iframeOrTestPane: JSX.Element = <></>;

        if (showIframeTestPane) {
            if (isEditor) {
                iframeOrTestPane = <Card sx={{ height: "100%" }}>
                    <Stack direction="column" sx={{ height: "100%" }}>
                        <Stack direction="row" justifyContent="space-between">
                            <Stack direction="row" sx={{ m: 1, height: "24px", alignItems: "center", flexShrink: 0 }}>
                                <TypescriptIcon />
                                <Typography variant="overline" sx={{ ml: 1 }}>Tests</Typography>
                            </Stack>
                            <Stack direction="row" sx={{ m: 1, mr: 0, height: "24px", alignItems: "center", overflowX: "clip" }}>
                                <Typography variant="overline" sx={{ mr: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Require checks to submit</Typography>
                                <Checkbox sx={{ m: "-9px", mr: 0 }} checked={mustPassToSubmit}
                                    onChange={ev => ev.target.checked === mustPassToSubmit ? null : onActivityConfigChange!({
                                        ...activityConfig,
                                        tests: {
                                            source: testsSource,
                                            mustPassToSubmit: ev.target.checked
                                        }
                                    })} />
                            </Stack>
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
                                    fixedOverflowWidgets: true,
                                }}
                                language="typescript"
                                value={testsSource}
                                onChange={val => testsSource === val ? undefined : onActivityConfigChange!({
                                    ...activityConfig,
                                    tests: {
                                        source: val ?? "",
                                        mustPassToSubmit
                                    }
                                })} />
                        </Box>
                        <CodeAlert error={testsCompileError} successMessage="Your tests compiled successfully!" />
                    </Stack>
                </Card>
            }
            else {
                iframeOrTestPane
                    = <ActivityIframe
                        htmlTemplate={activityTypeHiddenHtml.configurable ? hiddenHtml : activityTypeHiddenHtml.value}
                        html={isHtmlEnabled ? editorStates.html?.value : undefined}
                        js={isCodeEnabled ? compiledJs : undefined}
                        css={isCssEnabled ? editorStates.css?.value : undefined}
                        reloadRef={reloadRef}
                        runTestsRef={runTestsRef}
                        sx={{
                            width: "100%",
                            flexGrow: 1,
                            border: "none",
                            borderRadius: "4px"
                        }} />;
            }
        }

        function runTests() {
            if (activityTypeHasTests && runTestsRef.current) {
                openTestsDialog();
                runTestsRef.current(
                    testsSource ?? '',
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

        const descriptionPane = description ? <ReflexElement minSize={40} flex={!isMediumLayout ? 2 : undefined}>
            <Card sx={{ height: "100%" }}>
                <Stack direction="column" sx={{ height: "100%" }}>
                    <Stack direction="row" sx={{ m: 1, height: "24px", alignItems: "center", flexShrink: 0 }}>
                        <Typography variant="overline" sx={{ ml: 1 }}>Instructions</Typography>
                    </Stack>
                    {isEditor
                        ? <Box sx={{ flexGrow: 1 }}><Editor
                            theme="vs-dark"
                            options={{
                                minimap: { enabled: false },
                                "semanticHighlighting.enabled": true,
                                fixedOverflowWidgets: true,
                                lineNumbers: "off",
                                lineDecorationsWidth: 0,
                                wordWrap: "on",
                            }}
                            language="markdown"
                            value={description}
                            onChange={val => description === val ? undefined : onActivityConfigChange!({
                                ...activityConfig,
                                description: val ?? ""
                            })} /></Box>
                        : <CardContent sx={{ pt: 0, flexGrow: 1, overflow: "auto" }}>
                            <ReactMarkdown
                                rehypePlugins={[[rehypeHighlight, {ignoreMissing: true}]]}
                                remarkPlugins={[remarkGfm]}
                                linkTarget="_blank">{description}</ReactMarkdown>
                        </CardContent>}
                </Stack>
            </Card>
        </ReflexElement> : null;

        const codeEditors = [
            (isEditor && activityTypeHiddenHtml.configurable) || isHtmlEnabled ? editorPane('html', htmlDescription) : undefined,
            (isEditor && activityTypeHiddenHtml.configurable) || isHtmlEnabled && (isCodeEnabled || isCssEnabled) ? <ReflexSplitter propagate={true} /> : undefined,
            isCodeEnabled ? editorPane('code', language) : undefined,
            isCodeEnabled && isCssEnabled ? <ReflexSplitter propagate={true} /> : undefined,
            isCssEnabled ? editorPane('css', cssDescription) : undefined,
        ];

        const controls = isEditor ? null : <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: "6px" }}>
            {activityTypeHasTests && testsSource
                ? <Button variant="contained" onClick={runTests}>Run tests</Button>
                : <Button variant="contained" onClick={makeSubmission}>Submit</Button>}
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title="Apply all changes" disableInteractive>
                <IconButton onClick={applyAllChanges}><SyncIcon/></IconButton>
            </Tooltip>
            <Tooltip title="Reload" disableInteractive>
                <IconButton onClick={reloadRef.current}><RefreshIcon/></IconButton>
            </Tooltip>
        </Stack>;

        let layout: JSX.Element;

        if (isSmallLayout) {
            layout = <>
                {controls}
                <Card sx={{ height: "calc(100% - 36px)", flexGrow: 1, display: "flex", flexDirection: "column" }}>
                    {/* Need to use React.createElement because of limitations in
                        the Re-Flex used for having draggable panes */}
                    {React.createElement(ReflexContainer, {},
                        descriptionPane,
                        <ReflexSplitter propagate={true} />,
                        ...codeEditors,
                        showIframeTestPane ? <ReflexSplitter propagate={true} /> : null,
                        showIframeTestPane ? <ReflexElement>
                            <Stack direction="column" sx={{ height: "100%" }}>
                                {iframeOrTestPane}
                            </Stack>
                        </ReflexElement> : null
                    )}
                </Card>
            </>;
        }
        else if (isMediumLayout && showIframeTestPane) {
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
                <ReflexElement minSize={40} flex={showIframeTestPane ? 3 : 5}>
                    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                        {React.createElement(ReflexContainer, {}, ...codeEditors)}
                    </Card>
                </ReflexElement>
                {showIframeTestPane ? <ReflexSplitter propagate={true} /> : null}
                {showIframeTestPane ? <ReflexElement minSize={isEditor ? 40 : 250} flex={2}>
                    <Stack direction="column" sx={{ height: "100%" }}>
                        {controls}
                        {iframeOrTestPane}
                    </Stack>
                </ReflexElement> : null}
            </ReflexContainer>;
        }

        return <>
            {testsDialog}
            {layout}
        </>;
    }
}

export default function createTestActivityPages<Config extends HtmlTestActivityBaseConfig>(options: HtmlTestActivityOptions = {}): [
    activityPage: (props: ActivityPageProps<Config>) => JSX.Element,
    configPage: (props: ActivityConfigPageProps<Config>) => JSX.Element
] {
    const activityPage = createTestActivityPage({ isEditor: false, options });
    const configPage = createTestActivityPage({ isEditor: true, options });

    return [activityPage, configPage];
}