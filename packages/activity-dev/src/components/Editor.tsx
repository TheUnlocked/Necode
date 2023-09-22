import MonacoEditor, { Monaco, OnChange, OnMount, OnValidate } from "@monaco-editor/react";
import { editor, Selection } from 'monaco-editor';
import { nanoid } from 'nanoid';
import { useCallback, useEffect, useState } from 'react';
import { MonacoBinding, setMonaco } from 'y-monaco';
import { LanguageDescription } from '@necode-org/plugin-dev';
import cyrb53 from '~utils/cyrb53';
import { DisposeFn } from '~utils/types';
import { YTextHandle } from '../hooks/useY';
import { Y, YAwareness } from '../utils/y-utils';

export {
    type OnChange as OnEditorChange,
    type OnMount as OnEditorMount,
    type OnValidate as OnEditorValidate,
} from "@monaco-editor/react";

export interface EditorProps {
    value?: YTextHandle | string;
    onChange?: OnChange;
    onMount?: OnMount;
    onValidate?: OnValidate;
    language?: LanguageDescription | string;
    awareness?: YAwareness;
    height?: string | number;
    theme?: string;
    options?: editor.IStandaloneEditorConstructionOptions;
}

const baseOptions = {
    minimap: { enabled: false },
    "semanticHighlighting.enabled": true,
    fixedOverflowWidgets: true,
};

function interceptMonacoEditStack(model: editor.ITextModel, beforePushOrPop: () => void): DisposeFn {
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
    
    return () => {
        model.pushStackElement = pushStackElement;
        model.popStackElement = popStackElement;
    };
}

function fixAddCommand(editor: editor.IStandaloneCodeEditor, context: string): DisposeFn {
    const addCommand = editor.addCommand;

    editor.addCommand = function addCommand_hijacked(keybinding, handler, _context) {
        if (_context !== undefined) {
            console.error(
                'editor.addCommand cannot use the context parameter. ' +
                'This is due to a workaround for an upstream bug: ' +
                'https://github.com/microsoft/monaco-editor/issues/2947'
            );
        }
        return addCommand.call(this, keybinding, handler, context);
    };

    return () => {
        editor.addCommand = addCommand;
    };
}

function safeCssString(str: string) {
    // See spec: https://w3c.github.io/csswg-drafts/css-syntax-3/#string-token-diagram
    return `'${str.replace(/[\\'\n]/g, c => `\\${c}`)}'`;
}

function SharedEditorUserStyle({ id, displayName }: { id: number, displayName?: string }) {
    const colorSource = displayName ? cyrb53(displayName) : BigInt(id);
    // TODO: Change hsl to lch once support lands: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/lch
    const cursorColor = `hsl(${colorSource % 360n}deg, 100%, 50%)`;
    const nameBackgroundColor = `hsl(${colorSource % 360n}deg, 100%, 30%)`;
    const selectionColor = `hsl(${colorSource % 360n}deg, 100%, 30%, 0.4)`;
    return <style>{`
        .yRemoteSelection-${id} {
            background-color: ${selectionColor};
        }

        .yRemoteSelectionHead-${id} {
            position: absolute;
            border-left: ${cursorColor} solid 2px;
            ${displayName ? '' : `
                border-top: ${cursorColor} solid 2px;
            `}
            height: 100%;
            box-sizing: border-box;
        }

        .yRemoteSelectionHead-${id}::after {
            position: absolute;
            pointer-events: none;
            content: ${safeCssString(displayName ?? ' ')};
            ${displayName ? `
                background-color: ${nameBackgroundColor};
                line-height: 1;
                padding: 2px 2px 2px 1px;
                font-size: 10px;
                color: white;
                font-family: "Roboto","Helvetica","Arial",sans-serif;
                top: 0;
                transition: opacity 0.2s ease-in-out;
                opacity: 0;
            ` : `
                border: ${cursorColor} 2.5px solid;
                border-radius: 4px;
                left: -4px;
                top: -3px;
            `}
        }

        ${displayName ? `
            .view-line:hover .yRemoteSelectionHead-${id}::after,
            .view-line:hover + .view-line .yRemoteSelectionHead-${id}::after,
            .view-line:has(+ .view-line:hover) .yRemoteSelectionHead-${id}::after {
                opacity: 1;
            }
            .view-line .yRemoteSelectionHead-${id}:has(~ span:hover)::after {
                opacity: 0.2;
            }
        ` : ''}
    `}</style>;
}

export default function Editor({
    language,
    value,
    onChange,
    onMount,
    onValidate,
    awareness,
    options,
    theme,
    height,
}: EditorProps) {
    const [editorData, setEditorData] = useState<[editor.IStandaloneCodeEditor, Monaco]>();

    const mountHandler: OnMount = useCallback((editor, monaco) => {
        setMonaco(monaco);
        setEditorData([editor, monaco]);

        const model = editor.getModel()!;
        model.setEOL(monaco.editor.EndOfLineSequence.LF);

        // Based on workaround in https://github.com/grafana/grafana/pull/60172
        const editorFocusedContextKeyName = `__isEditorFocused-${nanoid()}`;
        const isEditorFocused = editor.createContextKey<boolean>(editorFocusedContextKeyName, false);
        const onBlurDisposable = editor.onDidBlurEditorWidget(() => isEditorFocused.set(false));
        const onFocusDisposable = editor.onDidFocusEditorText(() => isEditorFocused.set(true));
        const disposeAddCommandFix = fixAddCommand(editor, editorFocusedContextKeyName);

        onMount?.(editor, monaco);

        return () => {
            onBlurDisposable.dispose();
            onFocusDisposable.dispose();
            disposeAddCommandFix();
        };
    }, [onMount]);

    const [yText, valueStr]
        = value == null
            ? []
        : typeof value === 'string'
            ? [undefined, value]
            : [value._text, undefined];

    useEffect(() => {
        if (yText && editorData) {
            const [editor, monaco] = editorData;
            const model = editor.getModel()!;

            model.setValue(yText.toString());
            model.setEOL(monaco.editor.EndOfLineSequence.LF);
            const binding = new MonacoBinding(
                yText,
                model,
                new Set([editor]),
                awareness,
            );

            const undoManager = new Y.UndoManager(yText, { captureTimeout: Infinity, trackedOrigins: new Set([binding, 'submission']) });
            let selections:  Selection[] | null = null;
            const disposeMonacoEditStackBinding = interceptMonacoEditStack(model, () => {
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
                disposeMonacoEditStackBinding();
            };
        }
    }, [yText, awareness, editorData]);

    const [awarenessEntries, setAwarenessEntries] = useState<[
        id: number,
        state: {
            displayName?: string;
        }
    ][]>([]);

    useEffect(() => {
        if (awareness) {
            const handler = () => {
                setAwarenessEntries(Array.from(awareness.getStates().entries()));
            };
            awareness.on('update', handler);
            return () => awareness.off('update', handler);
        }
    }, [awareness]);

    return <>
        {awarenessEntries.map(([id, state]) => <SharedEditorUserStyle id={id} displayName={state.displayName} key={id} />)}
        <MonacoEditor
            theme={theme ?? "vs-dark"}
            height={height}
            options={{ ...baseOptions, ...options }}
            language={typeof language === 'string' ? language : language?.monacoName}
            value={valueStr}
            onChange={onChange}
            onMount={mountHandler}
            onValidate={onValidate}
        />
    </>;
}