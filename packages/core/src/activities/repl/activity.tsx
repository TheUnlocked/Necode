import { Box, Button, CircularProgress, useTheme } from '@mui/material';
import { Panes, Pane, Editor, Key, PaneTitle, useIsSizeOrSmaller, useMonaco } from '@necode-org/activity-dev';
import { ActivityPageProps } from '@necode-org/plugin-dev';
import { editor } from 'monaco-editor';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Config } from '.';


interface TextLine {
    leadingChar: ReactNode;
    text: ReactNode;
}

function Line({ data: { leadingChar, text } }: { data: TextLine }) {
    return <>
        <Box component="span" sx={{ userSelect: "none" }}>{leadingChar} </Box>
        <Box display="inline-block" pr="1em" sx={{
            width: "stretch",
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
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

    useEffect(() => {
        replCodeRef.current = replCode;
    }, [replCode]);

    const instanceRef = useRef<{
        evaluate(code: string): Promise<{ type: 'result' | 'text', contents: string }[]>
    }>();

    const [output, setOutput] = useState([] as TextLine[]);

    const runCode = useCallback(async (code: string | undefined, colorize: typeof editor.colorize, showInput: boolean) => {
        const instance = instanceRef.current;
        if (instance && code) {
            setComputing(true);
            setReplCode('');

            const result = instance.evaluate(code);
            const colorizedInput = await colorize(code, monacoNameRef.current, {});

            if (showInput) {
                setOutput(output => output.concat([
                    ...colorizedInput.split('<br/>').slice(0, -1).map((x, i) => ({
                        leadingChar: i === 0 ? '>' : '.',
                        text: <Box display="contents" dangerouslySetInnerHTML={{ __html: x }} />,
                    }))
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
                    leadingChar: ' ',
                    text: x
                })),
            ]);
        }
    }, []);

    const monaco = useMonaco();

    const [reloadCounter, setReloadCounter] = useState(0);

    useEffect(() => {
        if (!monaco) {
            return;
        }

        let destroyed = false;
        let destroy: undefined | (() => void);

        setOutput([]);
        setComputing(true);
        setIsDirty(false);
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
                <Button size="small" onClick={() => setReloadCounter(x => x + 1)}
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
                    
                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => setReloadCounter(x => x + 1));
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