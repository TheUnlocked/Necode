import Editor, { OnChange, OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useMemo, useState } from 'react';
import LanguageDescription from "../../languages/LangaugeDescription";
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { MonacoBinding } from 'y-monaco';
import { editor } from 'monaco-editor';
import cyrb53 from '../../util/cyrb53';

export interface PaneEditorProps {
    isConfig: boolean;
    
    value: string | undefined;
    onChange: OnChange;
    language: LanguageDescription;
    applyChanges?: () => void;
    yText?: Y.Text;
    yAwareness?: Awareness;
}

const monacoOptions = {
    minimap: { enabled: false },
    "semanticHighlighting.enabled": true,
    fixedOverflowWidgets: true,
};

function safeCssString(str: string) {
    // See spec: https://w3c.github.io/csswg-drafts/css-syntax-3/#string-token-diagram
    return `'${str.replace(/[\\'\n]/g, c => `\\${c}`)}'`;
}

export default function PaneEditor({ isConfig, language, value, onChange, applyChanges, yText, yAwareness }: PaneEditorProps) {
    const [editor, setEditor] = useState<editor.IStandaloneCodeEditor>();

    const onMount: OnMount = useCallback((editor, monaco) => {
        if (!isConfig) {
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, applyChanges!);
            setEditor(editor);
        }
    }, [isConfig, applyChanges]);

    useEffect(() => {
        if (yText && editor) {
            const binding = new MonacoBinding(
                yText,
                editor.getModel()!,
                new Set([editor]),
                yAwareness,
            );
            return () => {
                binding.destroy();
            };
        }
    }, [yText, yAwareness, editor, language.name]);

    const [awarenessEntries, setAwarenessEntries] = useState<[
        id: number,
        state: {
            displayName?: string;
        }
    ][]>([]);
    console.log(awarenessEntries);

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
            // do not set value here because that is handled by the MonacoBinding
            onChange={onChange}
        />
    </>;
}