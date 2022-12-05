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
    yDoc?: Y.Doc;
    yAwareness?: Awareness;
}

const monacoOptions = {
    minimap: { enabled: false },
    "semanticHighlighting.enabled": true,
    fixedOverflowWidgets: true,
};

export default function PaneEditor({ isConfig, language, value, onChange, applyChanges, yDoc, yAwareness }: PaneEditorProps) {
    const [editor, setEditor] = useState<editor.IStandaloneCodeEditor>();

    const onMount: OnMount = useCallback((editor, monaco) => {
        if (!isConfig) {
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, applyChanges!);
            setEditor(editor);
        }
    }, [isConfig, applyChanges]);

    useEffect(() => {
        if (yDoc && editor) {
            const binding = new MonacoBinding(
                yDoc.getText(language.name),
                editor.getModel()!,
                new Set([editor]),
                yAwareness,
            );
            return () => {
                binding.destroy();
            };
        }
    }, [yDoc, yAwareness, editor, language.name]);

    return <Editor
        theme="vs-dark"
        options={monacoOptions}
        language={language.monacoName}
        onMount={onMount}
        value={value}
        onChange={onChange}
    />;
}