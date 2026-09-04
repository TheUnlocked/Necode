import { alpha, Box, Button, CircularProgress, useTheme } from '@mui/material';
import { Panes, Pane, Editor, Key, PaneTitle, useIsSizeOrSmaller, useMonaco } from '@necode-org/activity-dev';
import { ActivityPageProps } from '@necode-org/plugin-dev';
import { editor } from 'monaco-editor';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Config } from '.';


interface TextLine {
    type: 'input' | 'output';
    leadingChar: ReactNode;
    text: ReactNode;
}

function Line({ data: { leadingChar, text, type } }: { data: TextLine }) {
    const theme = useTheme();
    const backgroundColor = theme.palette.background.default;
    const [leadingBackground, textBackground] = type === 'output'
        ? [backgroundColor, `linear-gradient(90deg, ${backgroundColor} 0%, ${alpha(backgroundColor, 0)} 70%)`]
        : [null, null];
    return <>
        <Box component="span" display="inline-block" sx={{ userSelect: "none", background: leadingBackground }}>{leadingChar} </Box>
        <Box display="inline-block" pr="1em" sx={{
            width: "stretch",
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            background: textBackground,
        }}>{text}</Box>
        {'\n'}
    </>;
}

export function Activity({ language, features }: ActivityPageProps<['repl/instanced'], Config>) {
    const monacoNameRef = useRef(language.monacoName);

    useEffect(() => {
        monacoNameRef.current = language.monacoName;
    }, [language.monacoName]);

    const [computing, setComputing] = useState(true);

    const startupCodeRef = useRef<string>();
    
    const [replCode, setReplCode] = useState<string>();
    const replCodeRef = useRef<string>();

    const [, setCommandHistory] = useState([] as string[]);

    const transientCommandHistory = useRef<(string | undefined)[]>(['']);
    const [focusedHistoryId, setFocusedHistoryId] = useState(0);

    function shiftCommandHistoryUp() {
        setFocusedHistoryId(curr => {
            transientCommandHistory.current[curr] = replCodeRef.current;
            return Math.min(transientCommandHistory.current.length - 1, curr + 1);
        });
    }

    function shiftCommandHistoryDown() {
        setFocusedHistoryId(curr => {
            transientCommandHistory.current[curr] = replCodeRef.current;
            return Math.max(0, curr - 1);
        });
    }

    useEffect(() => {
        replCodeRef.current = replCode;
    }, [replCode]);

    useEffect(() => {
        setReplCode(transientCommandHistory.current[focusedHistoryId]);
    }, [focusedHistoryId]);

    const instanceRef = useRef<{
        evaluate(code: string): Promise<{ type: 'result' | 'text', contents: string }[]>
    }>();

    const [output, setOutput] = useState([] as TextLine[]);

    const runCode = useCallback(async (code: string | undefined, colorize: typeof editor.colorize, showInput: boolean) => {
        const instance = instanceRef.current;
        if (instance && code) {
            setComputing(true);
            setReplCode('');

            if (showInput) {
                setCommandHistory(history => {
                    if (code !== history[0]) {
                        const newHistory = [code, ...history];
                        transientCommandHistory.current = ['', ...newHistory];
                        setFocusedHistoryId(0);
                        return newHistory;
                    }
                    setFocusedHistoryId(0);
                    transientCommandHistory.current = ['', ...history];
                    return history;
                });
            }

            const result = instance.evaluate(code);
            const colorizedInput = await colorize(code, monacoNameRef.current, {});

            if (showInput) {
                setOutput(output => output.concat([
                    ...colorizedInput.split('<br/>').slice(0, -1).map((x, i) => ({
                        type: 'input',
                        leadingChar: i === 0 ? '>' : '.',
                        text: <Box display="contents" dangerouslySetInnerHTML={{ __html: x }} />,
                    } as const))
                ]));
            }

            let colorizedResult: (ReactNode | string)[];
            try {
                colorizedResult = await Promise.all(
                    (await result).map(async (x, i) => x.type === 'result'
                        ? <Box key={i} display="contents" dangerouslySetInnerHTML={{
                            __html: await colorize(x.contents, monacoNameRef.current, {})
                        }} />
                        : x.contents)
                );
            }
            catch (e) {
                colorizedResult = [`${e}`];
            }

            setComputing(false);

            setOutput(output => [
                ...output,
                ...colorizedResult.map(x => ({
                    type: 'output',
                    leadingChar: ' ',
                    text: x
                } as const)),
            ]);
        }
    }, []);

    const monaco = useMonaco();

    const [reloadCounter, setReloadCounter] = useState(0);

    function reload() {
        setOutput([]);
        setIsDirty(false);
        setComputing(true);
        setReloadCounter(x => x + 1);
    }

    useEffect(() => {
        if (!monaco) {
            return;
        }

        let destroyed = false;
        let destroy: undefined | (() => void);

        features.repl.instanced.createInstance().then(async inst => {
            if (destroyed) {
                inst.destroy?.();
            }
            else {
                instanceRef.current = inst;
                await runCode(startupCodeRef.current, monaco.editor.colorize, false);
                setComputing(false);
                destroy = inst.destroy;
            }
        });

        return () => {
            destroyed = true;
            destroy?.();
        };
    }, [reloadCounter, features, runCode, monaco]);

    const [editorHeight, setEditorHeight] = useState(20);
    const updateHeight = (editor: editor.IStandaloneCodeEditor) => () => {
        const contentHeight = Math.max(20, Math.min(600, editor.getContentHeight()));
        setEditorHeight(contentHeight);
        editor.layout({ height: contentHeight, width: editor.getLayoutInfo().width });
    };

    const theme = useTheme();
    const isThin = useIsSizeOrSmaller('sm', theme);
    const [isDirty, setIsDirty] = useState(false);
    const showKeybindingHint = !isThin && isDirty;

    return <Panes layouts={{ panesPerColumn: [1, 1] }}>
        <Pane icon={language.icon ? <language.icon /> : undefined} label={language.displayName}
            toolbar={<>
                {showKeybindingHint ? <PaneTitle>Press <Key>Ctrl</Key>+<Key>S</Key> to restart the REPL with new code</PaneTitle> : undefined}
                <Button size="small" onClick={() => reload()}
                    sx={{ ml: showKeybindingHint ? 0.5 : "auto", flexShrink: 0 }}>
                    Restart
                </Button>
            </>}    
        >
            <Editor language={language}
                onChange={v => {
                    startupCodeRef.current = v;
                    setIsDirty(true);
                }}
                onMount={(editor, monaco) => {
                    updateHeight(editor)();
                    editor.onDidContentSizeChange(updateHeight(editor));
                    
                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => reload());
                }} />
        </Pane>
        <Pane label="REPL" toolbar={computing ? <CircularProgress variant="indeterminate" size={24} /> : undefined}>
            <Box px={2} maxHeight="100%" fontSize="14px" sx={{ overflowY: "auto", overflowX: "hidden" }}
                // Keep scrolled to bottom
                display="flex" flexDirection="column-reverse"
            >
                <PaneTitle>{replCode ? <>Press <Key>Ctrl</Key>+<Key>Enter</Key> to run your input.</> : <>&nbsp;</>}</PaneTitle>
                <Box position="relative" mb="-2.4em" top="-2.4em" left="0.5em" height={editorHeight}>
                    <Editor language={language} value={replCode}
                        onChange={setReplCode}
                        onMount={(editor, monaco) => {
                            updateHeight(editor)();
                            editor.onDidContentSizeChange(updateHeight(editor));
                            
                            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                                runCode(replCodeRef.current, monaco.editor.colorize, true);
                            });

                            editor.onKeyDown(e => {
                                if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                                    if (e.keyCode === monaco.KeyCode.UpArrow && editor.getPosition()?.lineNumber === 1) {
                                        shiftCommandHistoryUp();
                                        e.preventDefault();
                                    }
                                    if (e.keyCode === monaco.KeyCode.DownArrow && editor.getPosition()?.lineNumber === editor.getModel()?.getLineCount()) {
                                        shiftCommandHistoryDown();
                                        e.preventDefault();
                                    }
                                }
                            });
                        }}
                        options={{
                            lineNumbers: 'off',
                            folding: false,
                            scrollBeyondLastLine: false,
                            suggest: {
                                showWords: false,
                            }
                        }} />
                </Box>
                <pre>
                    {output.map((x, i) => <Line data={x} key={i} />)}
                    {computing ? ' ' : '>'}
                </pre>
            </Box>
        </Pane>
    </Panes>;
}