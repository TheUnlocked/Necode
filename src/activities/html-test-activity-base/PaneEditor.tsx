import Editor, { OnChange, OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useState } from 'react';
import LanguageDescription from "../../languages/LangaugeDescription";
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { MonacoBinding } from 'y-monaco';
import { editor } from 'monaco-editor';

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

    return <Editor
        theme="vs-dark"
        options={monacoOptions}
        language={language.monacoName}
        onMount={onMount}
        // do not set value here because that is handled by the MonacoBinding
        onChange={onChange}
    />;
}