import { Refresh as RefreshIcon, Sync as SyncIcon } from "@mui/icons-material";
import { Box, Button, CardContent, Checkbox, IconButton, Stack, Tooltip, useTheme } from "@mui/material";
import { api, applyTransaction, CodeAlert, Editor, Feature, FeatureObject, Key, Link, NetworkId, OnEditorChange, Pane, Panes, PanesLayouts, PaneTab, PaneTitle, PassthroughPane, TabbedPane, useApiGet, useFetch, useImperativeDialog, useImported, useIsSizeOrSmaller, useLanguageFeatures, useLanguages, useMonaco, useSubmissions, useY, useYAwareness, useYInit, useYText } from "@necode-org/activity-dev";
import { ActivityPageProps, LanguageDescription } from '@necode-org/plugin-dev';
import { ActivityConfigPageProps } from '@necode-org/plugin-dev';
import { debounce, identity } from "lodash";
import { set as setIn } from "lodash/fp";
import { editor } from 'monaco-editor';
import testScaffoldingTypes from "raw-loader!./test-scaffolding.d.ts.raw";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { ImplicitNewType, NonStrictDisjunction } from "~utils/types";
import TypescriptIcon from "../../icons/TypescriptIcon";
import transformTestScaffolding from "../../languages/transformers/babel-plugin-transform-test-scaffolding";
import { ActivityIframe, IframeActions } from "./ActivityIframe";
import TestsDialog from "./TestsDialog";

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

export type HTAFeatures = ['iframe/static'];

type PartialIf<Condition extends boolean, O> = Condition extends true ? Partial<O> : O;

export type HtmlTestActivityOptions<Features extends readonly Feature[] = HTAFeatures> = {
    hasTests?: boolean;
    hasHtml?: boolean;
    hasCss?: boolean;
    hasCode?: boolean;
    hiddenHtml?: { configurable: true } | { configurable: false, value?: string };

    networked?: boolean;

    typeDeclarations?: string | URLString[];
} & PartialIf<HTAFeatures[number] extends Features[number] ? true : false, {
    mapFeatures(obj: FeatureObject<Features>): FeatureObject<HTAFeatures>;
}>;

interface HtmlTestActivityMetaProps<Features extends readonly Feature[]> {
    isEditor: boolean;
    options: HtmlTestActivityOptions<Features>;
}

type EditorType = 'html' | 'code' | 'css';

/**
 * This exists for backwards compatibility.
 * New activities should not have an unversioned submission schema.
 */
interface SubmissionSchemaUnversioned {
    schemaVer: -1;
    data: never;
    
    html?: string;
    code?: string;
    css?: string;
}

interface SubmissionSchemaV1 {
    schemaVer: 1;
    data: {
        html?: string;
        code?: string;
        css?: string;
    };
}

type SubmissionSchema = SubmissionSchemaUnversioned | SubmissionSchemaV1;

const markdownEditorOptions: editor.IStandaloneEditorConstructionOptions = {
    lineNumbers: "off",
    lineDecorationsWidth: 0,
    wordWrap: "on",
};

const noopIframeActions = {
    async reload() {},
    async runTests() {},
    async waitForReload() {},
};

export default function createTestActivityPage<Features extends readonly Feature[]>({
    isEditor,
    options: {
        hasTests: activityTypeHasTests = true,
        hasHtml: activityTypeHasHtml = true,
        hasCss: activityTypeHasCss = true,
        hasCode: activityTypeHasCode = true,
        hiddenHtml: activityTypeHiddenHtml = { configurable: true },
        typeDeclarations: typeDeclarationsSource,
        networked = false,
        mapFeatures = identity,
    }
}: HtmlTestActivityMetaProps<Features>) {
    return function TestActivityPage<Config extends HtmlTestActivityBaseConfig>(
        props: (ActivityConfigPageProps<Features, Config> & { roomId?: number }) | ActivityPageProps<Features, Config>
    ) {
        const {
            language,
            features: _features,
            activityConfig,
            onActivityConfigChange,
            roomId = '',
        } = props as NonStrictDisjunction<ActivityConfigPageProps<Features, Config> & { roomId?: number }, ActivityPageProps<Features, Config>>;
        
        const features = mapFeatures(_features);

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
        
        const [committedState, setCommittedState] = useState<{
            readonly html?: string;
            readonly code?: string;
            readonly css?: string;
        }>({});

        const network = networked && !isEditor ? NetworkId.NET_0 : NetworkId.OFFLINE;

        const y = useY(network, `shared-editors-${roomId}`);

        useYInit(y, doc => {
            for (const type of ['html', 'css', 'code'] as const) {
                const initialValue = type === 'code'
                    ? activityConfig.languages[type]?.defaultValue[language.name]
                    : activityConfig.languages[type]?.defaultValue;
                if (initialValue) {
                    doc.getText(type).insert(0, initialValue);
                }
                setCommittedState(st => ({ ...st, [type]: initialValue ?? '' }));
            }
        });

        const activityConfigRef = useRef(activityConfig);
        activityConfigRef.current = activityConfig;
        useEffect(() => {
            if (isEditor) {
                applyTransaction(y, doc => {
                    const text = doc.getText('code');
                    text.delete(0, text.length);
                    text.insert(0, activityConfigRef.current.languages.code?.defaultValue[language.name] ?? '');
                });
            }
        }, [y, language]);
        
        const uncommittedHtml = useYText(y, 'html');        
        const uncommittedCode = useYText(y, 'code');        
        const uncommittedCss = useYText(y, 'css');        
        const uncommittedValues = useMemo(() => ({
            html: uncommittedHtml.value,
            code: uncommittedCode.value,
            css: uncommittedCss.value,
        }), [uncommittedHtml, uncommittedCode, uncommittedCss]);

        const { data: me } = useApiGet(api.me());

        const yAwareness = useYAwareness(y, 'shared-editors-awareness', {
            displayName: me?.attributes.displayName,
        });

        const submit = useSubmissions<SubmissionSchema>(submission => {
            let contents: typeof committedState;
            switch (submission.schemaVer) {
                case -1:
                    // Old unversioned schema
                    contents = submission as any;
                    break;
                case 1:
                    contents = submission.data;
                    break;
                default:
                    console.error(`Unrecognized submission format ${submission}`);
                    return;
            }
            applyTransaction(y, doc => {
                for (const type of ['html', 'code', 'css'] as const) {
                    const toInsert = contents[type];
                    const text = doc.getText(type);
                    text.delete(0, text.length);
                    if (toInsert) {
                        text.insert(0, toInsert);
                    }
                }
            }, 'submission');
        });

        const iframeActions = useRef<IframeActions>(noopIframeActions);

        const applyChanges = useCallback((type: EditorType) => {
            setCommittedState(st => ({
                ...st,
                [type]: uncommittedValues[type],
            }));
        }, [uncommittedValues]);

        const applyChangesRef = useRef(applyChanges);

        useEffect(() => { applyChangesRef.current = applyChanges }, [applyChanges]);

        const { download } = useFetch();

        const startTests = useRef(() => {});
        const passTests = useRef(() => {});
        const failTests = useRef((_: string) => {});

        async function makeSubmission() {
            await submit(1, committedState);
            closeTestsDialog();
        }

        const [testsDialog, openTestsDialog, closeTestsDialog] = useImperativeDialog(TestsDialog, {
            mustPassToSubmit,
            startRunningRef: f => startTests.current = f,
            successRef: f => passTests.current = f,
            failureRef: f => failTests.current = f,
            onSubmit: makeSubmission
        });

        const applyAllChanges = useCallback(() => {
            setCommittedState(uncommittedValues);
        }, [uncommittedValues]);

        const applyChangesAndWait = useCallback(async () => {
            setCommittedState(st => {
                for (const type of ['html', 'code', 'css'] as const) {
                    if (uncommittedValues[type] !== st[type]) {
                        iframeActions.current.waitForReload();
                        return uncommittedValues;
                    }
                }
                return st;
            });
        }, [uncommittedValues]);

        const [compiledJs, setCompiledJs] = useState('');
        const codeSource = committedState.code;

        useEffect(() => {
            if (codeSource !== undefined) {
                features.iframe.static.compile(codeSource)
                    .then(setCompiledJs)
                    .catch(e => {
                        console.error(e);
                        setCompiledJs('// compilation error');
                    });
            }
        }, [codeSource, features]);

        const [htmlDescription, cssDescription] = useLanguages('html', 'css');

        const theme = useTheme();
        const isThinish = useIsSizeOrSmaller('md', theme);
        const isThinLayout = useIsSizeOrSmaller('sm', theme);
        const [selectedHtmlTab, setSelectedHtmlTab] = useState(activityTypeHasHtml ? 'starter' : 'hidden');

        const editorPane = useCallback((type: EditorType, language: LanguageDescription, hidden: boolean) => {
            if (hidden) {
                return <PassthroughPane hidden />;
            }

            const isHiddenHtmlOnly = type === 'html' && !activityTypeHasHtml;
            
            const Icon = language.icon;

            const text = {
                html: uncommittedHtml,
                code: uncommittedCode,
                css: uncommittedCss,
            }[type];
            const uncommittedValue = text.value;

            const editorValue = isEditor
                ? isHiddenHtmlOnly
                    ? ''
                    : type === 'code'
                        ? activityConfig.languages.code!.defaultValue![language.name] ?? ''
                        : activityConfig.languages[type]!.defaultValue
                : uncommittedValue;

            const onHiddenHtmlChange: OnEditorChange = value => {
                if (activityConfig.hiddenHtml !== value) {
                    onActivityConfigChange!({
                        ...activityConfig,
                        hiddenHtml: value ?? ''
                    });
                }
            };

            const onChange: OnEditorChange = value => {
                if (isEditor) {
                    if (editorValue !== value) {
                        onActivityConfigChange!(setIn(
                            `languages.${type}.defaultValue${type === "code" ? `.${language.name}` : ''}`,
                            value,
                            activityConfig,
                        ));
                    }
                }
            };

            if (isEditor) {
                function tabLabelWithCheckbox(active: boolean) {
                    const langConfig = activityConfig.languages[type as Exclude<EditorType, 'hidden-html'>];

                    if (!langConfig) {
                        return <></>;
                    }

                    return <>
                        <PaneTitle selectable={false} color={active ? undefined : 'disabled'} sx={{ mx: 1 }}>Starter</PaneTitle>
                        <Checkbox sx={{ m: "-9px", mr: type === 'html' ? 0 : -1 }}
                            checked={langConfig.enabled}
                            disabled={!active}
                            onChange={ev => {
                                if (ev.target.checked !== langConfig.enabled) {
                                    onActivityConfigChange!(setIn(`languages.${type}.enabled`, ev.target.checked, activityConfig));
                                }
                            }} />
                    </>;
                }

                if (type === 'html') {
                    return <TabbedPane label="HTML" value={selectedHtmlTab} onChange={setSelectedHtmlTab} actUntabbedWithOneChild>
                        <PaneTab value="hidden" label="Hidden">
                            <Editor
                                language={htmlDescription}
                                value={activityConfig.hiddenHtml}
                                onChange={onHiddenHtmlChange} />
                        </PaneTab>
                        <PaneTab value="starter" label={tabLabelWithCheckbox(selectedHtmlTab === 'starter')} hidden={isHiddenHtmlOnly}>
                            <Editor
                                language={language}
                                value={text}
                                onChange={onChange} />
                        </PaneTab>
                    </TabbedPane>;
                }
                else {
                    return <Pane icon={Icon ? <Icon /> : undefined} label={language.displayName} toolbar={tabLabelWithCheckbox(true)}>
                        <Editor
                            language={language}
                            value={text}
                            onChange={onChange}
                            awareness={yAwareness} />
                    </Pane>;
                }
            }
            else {
                const isDirty = !isEditor && uncommittedValue !== committedState[type];
                const showKeybindingHint = !isThinish && isDirty;

                const toolbar = <>
                    {showKeybindingHint ? <PaneTitle>Press <Key>Ctrl</Key>+<Key>S</Key> to apply changes</PaneTitle> : undefined}
                    <Button size="small" onClick={() => applyChanges(type)} disabled={!isDirty}
                        sx={{ ml: showKeybindingHint ? 0.5 : "auto", flexShrink: 0 }}>
                        Apply changes
                    </Button>
                </>;

                return <Pane icon={Icon ? <Icon /> : undefined} label={language.displayName} toolbar={toolbar}>
                    <Editor
                        language={language}
                        value={text}
                        onMount={(editor, monaco) => {
                            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => applyChangesRef.current(type));
                        }}
                        onChange={onChange}
                        awareness={yAwareness} />
                </Pane>;
            }
        }, [selectedHtmlTab, isThinish, committedState, applyChanges, activityConfig, onActivityConfigChange, uncommittedHtml, uncommittedCode, uncommittedCss, yAwareness, htmlDescription]);

        const monaco = useMonaco();

        const typeDeclarationFiles = useImported<{ content: string, filePath?: string }[]>(useCallback(async () => {
            if (typeDeclarationsSource) {
                if (typeof typeDeclarationsSource === 'string') {
                    return [{
                        content: typeDeclarationsSource,
                        filePath: 'activity-declarations.d.ts'
                    }];
                }
                else {
                    const results = await Promise.allSettled(
                        typeDeclarationsSource.map(url =>
                            download(url as string).then(x => x.text())
                                .then(x => [x, url as string])
                        )
                    );

                    return results
                        .filter((x): x is PromiseFulfilledResult<[string, string]> => x.status === 'fulfilled')
                        .map(x => x.value)
                        .map(([content, filePath]) => {
                            return { content, filePath: filePath.replace(/^https?/, 'file') };
                        });
                }
            }
            return [];
        }, [download]));

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

                for (const decl of typeDeclarationFiles ?? []) {
                    jsLibs.push(decl);
                    tsLibs.push(decl);
                }

                const jsLibDisposables = jsLibs.map(x => monaco.languages.typescript.javascriptDefaults.addExtraLib(x.content, x.filePath));
                const tsLibDisposables = tsLibs.map(x => monaco.languages.typescript.typescriptDefaults.addExtraLib(x.content, x.filePath));

                return () => {
                    jsLibDisposables.forEach(x => x.dispose());
                    tsLibDisposables.forEach(x => x.dispose());
                };
            }
        }, [monaco, typeDeclarationFiles]);

        const [testsCompileError, setTestsCompileError] = useState<Error | undefined>();

        const typescriptFeatures = useLanguageFeatures('typescript', ['js/babel']);

        // Be very careful when editing this function, since exaustive-deps is disabled.
        // eslint-disable-next-line @grncdr/react-hooks/exhaustive-deps
        const validateTests = useCallback(debounce(async (tests: string) => {
            try {
                await typescriptFeatures?.js.babel.compileToJs(tests, [transformTestScaffolding]);
                setTestsCompileError(undefined);
            }
            catch (e) {
                if (e instanceof Error) {
                    if (e.message.startsWith('unknown file: ')) {
                        const newError = new Error(e.message.slice(14));
                        newError.name = e.name;
                        e = newError;
                    }
                    setTestsCompileError(e as Error);
                }
                else {
                    setTestsCompileError(new Error(`${e}`));
                }
            }
        }, 300), [typescriptFeatures]);

        useEffect(() => {
            if (isEditor && testsSource !== undefined) {
                validateTests(testsSource);
            }
        }, [testsSource, validateTests]);

        const controls = isEditor ? null : <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: "6px" }}>
            {activityTypeHasTests && testsSource
                ? <Button variant="contained" onClick={runTests}>Run tests</Button>
                : <Button variant="contained" onClick={makeSubmission}>Submit</Button>}
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title="Apply all changes" disableInteractive>
                <IconButton onClick={applyAllChanges}><SyncIcon/></IconButton>
            </Tooltip>
            <Tooltip title="Reload" disableInteractive>
                <IconButton onClick={() => iframeActions.current.reload()}><RefreshIcon/></IconButton>
            </Tooltip>
        </Stack>;

        let iframeOrTestPane = isEditor
            ? <Pane
                icon={<TypescriptIcon />}
                label={<>Tests<Link href="/docs/tests" target="_blank"><sup>?</sup></Link></>}
                hidden={!showIframeTestPane}
                toolbar={<>
                    <PaneTitle sx={{ mr: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Require checks to submit</PaneTitle>
                    <Checkbox sx={{ m: "-9px", mr: -1 }} checked={mustPassToSubmit}
                        onChange={ev => {
                            if (ev.target.checked !== mustPassToSubmit) {
                                onActivityConfigChange!(setIn('tests.mustPassToSubmit', ev.target.checked, activityConfig));
                            }
                        }} />
                </>}
            >
                <Stack height="100%" direction="column">
                    <Box overflow="hidden" flexGrow={1}>
                        <Editor
                            language="typescript"
                            value={testsSource}
                            onChange={val => {
                                if (testsSource !== val) {
                                    onActivityConfigChange!(setIn('tests.source', val ?? '', activityConfig));
                                }
                            }} />
                    </Box>
                    <CodeAlert error={testsCompileError} successMessage="Your tests compiled successfully!" />
                </Stack>
            </Pane>
            : <PassthroughPane>
                <Stack height="100%" direction="column">
                    {isThinLayout ? undefined : controls}
                    <ActivityIframe
                        htmlTemplate={activityTypeHiddenHtml.configurable ? hiddenHtml : activityTypeHiddenHtml.value}
                        html={isHtmlEnabled ? committedState.html : undefined}
                        js={isCodeEnabled ? compiledJs : undefined}
                        css={isCssEnabled ? committedState.css : undefined}
                        ref={iframeActions}
                        sx={{
                            width: "100%",
                            flexGrow: 1,
                            border: "none",
                            borderRadius: "4px"
                        }} />
                </Stack>
            </PassthroughPane>;
        
        async function runTests() {
            if (activityTypeHasTests) {
                openTestsDialog();
                await applyChangesAndWait();
                iframeActions.current.runTests(
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

        const descriptionPane = <Pane label="Instructions" hidden={description == null}>
            {isEditor
                ? <Box sx={{ height: "100%" }}><Editor
                    options={markdownEditorOptions}
                    language="markdown"
                    value={description}
                    onChange={val => {
                        if (description !== val) {
                            onActivityConfigChange!(setIn('description', val, activityConfig));
                        }
                    }} /></Box>
                : <CardContent sx={{ pt: 0, flexGrow: 1, overflow: "auto" }}>
                    <ReactMarkdown
                        rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}
                        remarkPlugins={[remarkGfm]}
                        linkTarget="_blank">{description ?? ''}</ReactMarkdown>
                </CardContent>}
        </Pane>;

        const layouts: PanesLayouts = {
            thin: { panesPerColumn: [5], weights: [{ column: 1, rows: [1, 1, 1, 1, 100] }] },
            medium: { panesPerColumn: [4, 1], weights: [5, 2] },
            wide: { panesPerColumn: [1, 3, 1], weights: [2, showIframeTestPane ? 3 : 5, 2] },
        };

        const panes = <Panes layouts={layouts}>
            {descriptionPane}
            {editorPane('html', htmlDescription!, !(isEditor && activityTypeHiddenHtml.configurable) && !isHtmlEnabled)}
            {editorPane('code', language, !isCodeEnabled)}
            {editorPane('css', cssDescription!, !isCssEnabled)}
            {iframeOrTestPane}
        </Panes>;

        let layout: JSX.Element;

        if (isThinLayout) {
            layout = <>
                {controls}
                {panes}
            </>;
        }
        else {
            layout = panes;
        }

        return <Box sx={{
            ".monaco-editor .suggest-widget": { zIndex: 101 },
            ".monaco-hover": { zIndex: 102 },
            height: "100%",
        }}>
            {testsDialog}
            {layout}
        </Box>;
    };
}
