import Editor, { OnChange, OnMount } from "@monaco-editor/react";
import { useCallback } from 'react';
import LanguageDescription from "../../languages/LangaugeDescription";

export interface PaneEditorProps {
    isConfig: boolean;
    
    value: string | undefined;
    onChange: OnChange;
    language: LanguageDescription;
    applyChanges?: () => void;
}

const monacoOptions = {
    minimap: { enabled: false },
    "semanticHighlighting.enabled": true,
    fixedOverflowWidgets: true,
};

export default function PaneEditor({ isConfig, language, value, onChange, applyChanges }: PaneEditorProps) {
    const onMount: OnMount = useCallback((editor, monaco) => {
        if (!isConfig) {
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, applyChanges!);
        }
    }, [isConfig, applyChanges]);

    return <Editor
        theme="vs-dark"
        options={monacoOptions}
        language={language.monacoName}
        onMount={onMount}
        value={value}
        onChange={onChange}
    />;
}