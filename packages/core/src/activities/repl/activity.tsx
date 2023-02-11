import { Box, Button, useTheme } from '@mui/material';
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

    const [uncommittedStartupCode, setUncommittedStartupCode] = useState<string>();
    const uncommittedStartupCodeRef = useRef<string>();
    const [startupCode, setStartupCode] = useState<string>();

    useEffect(() => {
        uncommittedStartupCodeRef.current = uncommittedStartupCode;
    }, [uncommittedStartupCode]);

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
            setComputing(false);

            const colorizedResult = await Promise.all(
                (await result).map(async (x, i) => x.type === 'result'
                    ? <Box key={i} display="contents" dangerouslySetInnerHTML={{
                        __html: await colorize(x.contents, monacoNameRef.current, {})
                    }} />
                    : x.contents)
            );
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

    useEffect(() => {
        if (!monaco) {
            return;
        }

        let destroyed = false;
        let destroy: undefined | (() => void);

        setOutput([]);
        setComputing(true);
        features.repl.instanced.createInstance().then(async inst => {
            if (destroyed) {
                inst.destroy?.();
            }
            else {
                instanceRef.current = inst;
                await runCode(startupCode, monaco.editor.colorize, false);
                setComputing(false);
                destroy = inst.destroy;
            }
        });

        return () => {
            destroyed = true;
            destroy?.();
        };
    }, [features, startupCode, runCode, monaco]);

    const [editorHeight, setEditorHeight] = useState(20);
    const updateHeight = (editor: editor.IStandaloneCodeEditor) => () => {
        const contentHeight = Math.max(20, Math.min(600, editor.getContentHeight()));
        setEditorHeight(contentHeight);
        editor.layout({ height: contentHeight, width: editor.getLayoutInfo().width });
    };

    const theme = useTheme();
    const isThin = useIsSizeOrSmaller('sm', theme);
    const isDirty = uncommittedStartupCode !== startupCode;
    const showKeybindingHint = !isThin && isDirty;

    return <Panes layouts={{ panesPerColumn: [1, 1] }}>
        <Pane icon={language.icon ? <language.icon /> : undefined} label={language.displayName}
            toolbar={<>
                {showKeybindingHint ? <PaneTitle>Press <Key>Ctrl</Key>+<Key>S</Key> to apply changes</PaneTitle> : undefined}
                <Button size="small" onClick={() => setStartupCode(uncommittedStartupCode)} disabled={!isDirty}
                    sx={{ ml: showKeybindingHint ? 0.5 : "auto", flexShrink: 0 }}>
                    Apply changes
                </Button>
            </>}    
        >
            <Editor language={language} value={uncommittedStartupCode}
                onChange={setUncommittedStartupCode}
                onMount={(editor, monaco) => {
                    updateHeight(editor)();
                    editor.onDidContentSizeChange(updateHeight(editor));
                    
                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                        setStartupCode(uncommittedStartupCodeRef.current);
                    });
                }} />
        </Pane>
        <Pane label="REPL">
            <Box px={2} maxHeight="100%" fontSize="14px" sx={{ overflowY: "auto", overflowX: "hidden" }}
                // Keep scrolled to bottom
                display="flex" flexDirection="column-reverse"
            >
                <PaneTitle>{replCode ? <>Press <Key>Ctrl</Key>+<Key>Enter</Key> to run your input.</> : <>&nbsp;</>}</PaneTitle>
                <Box position="relative" mb="-2.4em" top="-2.4em" left="0.5em" height={editorHeight}>
                    <Editor language={language} value={replCode} onChange={setReplCode}
                        onMount={(editor, monaco) => {
                            updateHeight(editor)();
                            editor.onDidContentSizeChange(updateHeight(editor));
                            
                            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                                runCode(replCodeRef.current, monaco.editor.colorize, true);
                            });
                        }}
                        options={{
                            // readOnly: computing,
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