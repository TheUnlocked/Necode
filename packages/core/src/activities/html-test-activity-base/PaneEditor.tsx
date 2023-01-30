import Editor, { Monaco, OnChange, OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useRef, useState } from 'react';
import { MonacoBinding, setMonaco } from 'y-monaco';
import { editor, Selection } from 'monaco-editor';
import cyrb53 from '~utils/cyrb53';
import { Y, YTextHandle, YAwareness, LanguageDescription } from '@necode-org/activity-dev';

export interface PaneEditorProps {
    isConfig?: boolean;
    
    value?: string;
    onChange: OnChange;
    language: LanguageDescription;
    applyChanges?: () => void;
    yText?: YTextHandle;
    yAwareness?: YAwareness;
}

const monacoOptions = {
    minimap: { enabled: false },
    "semanticHighlighting.enabled": true,
    fixedOverflowWidgets: true,
};

function interceptMonacoEditStack(model: editor.ITextModel, beforePushOrPop: () => void): { destroy(): void } {
    const pushStackElement = model.pushStackElement;
    const popStackElement = model.popStackElement;
    
    model.pushStackElement = function pushStackElement_hijacked() {
        beforePushOrPop();
        pushStackElement.apply(this);
    };

    model.popStackElement = function popStackElement_hijacked() {
        beforePushOrPop();
        popStackElement.apply(this);
    };
    
    return {
        destroy() {
            model.pushStackElement = pushStackElement;
            model.popStackElement = popStackElement;
        }
    };
}

function safeCssString(str: string) {
    // See spec: https://w3c.github.io/csswg-drafts/css-syntax-3/#string-token-diagram
    return `'${str.replace(/[\\'\n]/g, c => `\\${c}`)}'`;
}

export default function PaneEditor({ isConfig, language, value, onChange, applyChanges, yText, yAwareness }: PaneEditorProps) {
    const [editorData, setEditorData] = useState<[editor.IStandaloneCodeEditor, Monaco]>();

    const applyChangesRef = useRef<() => void>();

    const onMount: OnMount = useCallback((editor, monaco) => {
        setMonaco(monaco);
        editor.getModel()?.setEOL(0);
        setEditorData([editor, monaco]);
    }, []);

    useEffect(() => {
        applyChangesRef.current = applyChanges;
    }, [applyChanges]);

    useEffect(() => {
        if (!isConfig && editorData) {
            const [editor, monaco] = editorData;
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => applyChangesRef.current?.());
        }
    }, [isConfig, editorData]);

    const text = yText?._text;

    useEffect(() => {
        if (text && editorData) {
            const [editor, monaco] = editorData;
            const model = editor.getModel()!;

            const binding = new MonacoBinding(
                text,
                model,
                new Set([editor]),
                yAwareness,
            );

            const undoManager = new Y.UndoManager(text, { captureTimeout: Infinity, trackedOrigins: new Set([binding, 'submission']) });
            let selections:  Selection[] | null = null;
            const monacoEditStackBinding = interceptMonacoEditStack(model, () => {
                undoManager.captureTimeout = 0;
                selections = editor.getSelections();
            });

            undoManager.on('stack-item-added', (event: any) => {
                event.stackItem.meta.set('cursor', selections);
                undoManager.captureTimeout = Infinity;
            });
            
            undoManager.on('stack-item-popped', (event: any) => {
                editor.setSelections(event.stackItem.meta.get('cursor'));
                undoManager.captureTimeout = Infinity;
            });

            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => {
                selections = editor.getSelections();
                undoManager.undo();
            });
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, () => {
                selections = editor.getSelections();
                undoManager.redo();
            });
            
            return () => {
                binding.destroy();
                undoManager.destroy();
                monacoEditStackBinding.destroy();
            };
        }
    }, [text, yAwareness, editorData, language.name]);

    const [awarenessEntries, setAwarenessEntries] = useState<[
        id: number,
        state: {
            displayName?: string;
        }
    ][]>([]);

    useEffect(() => {
        if (yAwareness) {
            const handler = () => {
                setAwarenessEntries(Array.from(yAwareness.getStates().entries()));
            };
            yAwareness.on('update', handler);
            return () => yAwareness.off('update', handler);
        }
    }, [yAwareness]);

    return <>
        {awarenessEntries.map(([id, state]) => {
            const colorSource = state.displayName ? cyrb53(state.displayName) : BigInt(id);
            // TODO: Change hsl to lch once support lands: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/lch
            const cursorColor = `hsl(${colorSource % 360n}deg, 100%, 50%)`;
            const nameBackgroundColor = `hsl(${colorSource % 360n}deg, 100%, 30%)`;
            const selectionColor = `hsl(${colorSource % 360n}deg, 100%, 30%, 0.4)`;
            return <style key={id}>{`
                .yRemoteSelection-${id} {
                    background-color: ${selectionColor};
                }

                .yRemoteSelectionHead-${id} {
                    position: absolute;
                    border-left: ${cursorColor} solid 2px;
                    ${state.displayName ? '' : `
                        border-top: ${cursorColor} solid 2px;
                    `}
                    height: 100%;
                    box-sizing: border-box;
                }

                .yRemoteSelectionHead-${id}::after {
                    position: absolute;
                    pointer-events: none;
                    content: ${safeCssString(state.displayName ?? ' ')};
                    ${state.displayName ? `
                        background-color: ${nameBackgroundColor};
                        line-height: 1;
                        padding: 2px 2px 2px 1px;
                        font-size: 10px;
                        color: white;
                        font-family: "Roboto","Helvetica","Arial",sans-serif;
                        top: 0;
                        transition: opacity 0.2s ease-in-out;
                    ` : `
                        border: ${cursorColor} 2.5px solid;
                        border-radius: 4px;
                        left: -4px;
                        top: -3px;
                    `}
                }

                ${state.displayName ? `
                    .view-line:hover .yRemoteSelectionHead-${id}::after,
                    .view-line:hover + .view-line .yRemoteSelectionHead-${id}::after,
                    .view-line:has(+ .view-line:hover) .yRemoteSelectionHead-${id}::after {
                        opacity: 0.1;
                    }
                ` : ''}
            `}</style>;
        })}
        <Editor
            theme="vs-dark"
            options={monacoOptions}
            language={language.monacoName}
            onMount={onMount}
            // do not set value here because if it is handled by the MonacoBinding
            value={yText ? undefined : value}
            onChange={onChange}
        />
    </>;
}