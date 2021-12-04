import Editor, { OnChange, OnMount } from "@monaco-editor/react";
import LanguageDescription from "../../languages/LangaugeDescription";

export interface PaneEditorProps {
    isConfig: boolean;
    
    value: string | undefined;
    onChange: OnChange;
    language: LanguageDescription;
    applyChanges?: () => void;
}

export default function PaneEditor(props: PaneEditorProps) {
    if (props.isConfig) {
        return <Editor
            theme="vs-dark"
            options={{
                minimap: { enabled: false },
                "semanticHighlighting.enabled": true,
                automaticLayout: true,
                fixedOverflowWidgets: true,
            }}
            language={props.language.monacoName}
            value={props.value}
            onChange={props.onChange}
        />;
    }
    else {
        const onMount: OnMount = (editor, monaco) => {
            editor.addAction({
                id: 'apply-changes',
                label: 'Apply Changes',
                keybindings: [
                    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S
                ],
                run: props.applyChanges!
            });
        };

        return <Editor
            theme="vs-dark"
            options={{
                minimap: { enabled: false },
                "semanticHighlighting.enabled": true,
                fixedOverflowWidgets: true
            }}
            language={props.language.monacoName}
            onMount={onMount}
            value={props.value}
            onChange={props.onChange}
        />;
    }
}