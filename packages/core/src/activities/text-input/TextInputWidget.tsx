import { Code as CodeIcon, TextFields as TextFieldsIcon } from "@mui/icons-material";
import { ClickAwayListener, Grow, IconButton, MenuItem, MenuList, Paper, Popper, Stack, SxProps, TextField, Theme } from "@mui/material";
import { DragHandle, dragHandleClass, dragHandleSelector, Editor, useLocalCachedState, useMonaco, useLanguageList } from "@necode-org/activity-dev";
import { ActivityConfigWidgetProps } from '@necode-org/plugin-dev';
import { bindPopper, bindTrigger, usePopupState } from "material-ui-popup-state/hooks";
import type { editor } from "monaco-editor";
import { useCallback, useEffect, useRef, useState } from "react";

export interface TextInputWidgetProps {
    value: string;
    language: string | null;
}

const monacoOptions = {
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fixedOverflowWidgets: true,
    lineNumbers: 'off',
    lineDecorationsWidth: 0,
    folding: false,
    matchBrackets: 'never',
    renderLineHighlightOnlyWhenFocus: true,
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    overviewRulerBorder: false,
    renderIndentGuides: false,
    fontSize: 15
} as editor.IStandaloneEditorConstructionOptions;

export default function TextInputWidget({
    id,
    activityConfig: { value: _textContent, language },
    onActivityConfigChange,
    dragHandle
}: ActivityConfigWidgetProps<TextInputWidgetProps>) {
    const allLanguages = useLanguageList();

    const languageDescription = allLanguages.find(x => x.name === language);

    const languageSelectPopup = usePopupState({
        variant: "popper",
        popupId: `language-select-popup-${id}`
    });

    const onTextContentChange = useCallback((newValue: string) =>
        onActivityConfigChange({
            value: newValue,
            language
        }),
        [onActivityConfigChange, language]
    );

    const [textContent, setTextContent, commitTextContent] = useLocalCachedState(_textContent, onTextContentChange);

    const commitTextContentRef = useRef(commitTextContent);
    useEffect(() => {
        commitTextContentRef.current = commitTextContent;
    }, [commitTextContent]);

    function changeLanguage(newLanguage: string | null) {
        onActivityConfigChange({
            value: textContent,
            language: newLanguage
        });
    }

    const [editorHeight, setEditorHeight] = useState(20);
    const updateHeight = (editor: editor.IStandaloneCodeEditor) => () => {
        const contentHeight = Math.max(20, Math.min(200, editor.getContentHeight()));
        setEditorHeight(contentHeight);
        editor.layout({ height: contentHeight, width: editor.getLayoutInfo().width });
    };

    const border = {
        borderRadius: 1,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "transparent",
        "&:hover": {
            borderColor: ({ palette }) => palette.action.hover
        },
        transition: ({ transitions }) => transitions.create("border-color", {
            duration: transitions.duration.shorter,
            easing: transitions.easing.easeOut
        })
    } as SxProps<Theme>;

    const monaco = useMonaco();

    useEffect(() => {
        if (monaco) {
            monaco.editor.defineTheme('vs-black', {
                base: 'vs-dark',
                inherit: true,
                rules: [],
                colors: {
                    'editor.background': '#121212'
                }
            });
            monaco.editor.setTheme('vs-black');
        }
    });

    if (language !== null) {
        return <Stack direction="row" alignItems="center" spacing={0.5} sx={{
            px: 1,
            height: editorHeight + 16,
            overflow: "hidden",
            [`& ${dragHandleSelector}`]: {
                visibility: languageSelectPopup.isOpen ? "visible" : "hidden"
            },
            [`&:hover ${dragHandleSelector}`]: {
                visibility: "visible"
            },
            ...border
        }}>
            <DragHandle innerRef={dragHandle} iconProps={{ sx: { mr: 0.5 } }} />
            <Editor
                theme="vs-black"
                height={editorHeight}
                value={textContent} onChange={x => setTextContent(x ?? '')}
                onMount={editor => {
                    updateHeight(editor)();
                    editor.onDidContentSizeChange(updateHeight(editor));
                    editor.onDidBlurEditorText(() => commitTextContentRef.current());
                }}
                language={languageDescription}
                options={monacoOptions} />
            <span><IconButton size="small" className={dragHandleClass} sx={{ ml: 0.5 }}
                {...bindTrigger(languageSelectPopup)}>{languageDescription?.icon ? <languageDescription.icon /> : <CodeIcon/>}</IconButton></span>
            <Popper {...bindPopper(languageSelectPopup)} 
                placement="left" transition>
                {({ TransitionProps }) => <ClickAwayListener onClickAway={() => languageSelectPopup.close()}>
                    <Grow {...TransitionProps}>
                        <Paper elevation={4}>
                            <MenuList>
                                {allLanguages.map(lang =>
                                    <MenuItem key={lang.name} onClick={() => (languageSelectPopup.close(), changeLanguage(lang.name))}>
                                        {lang.displayName}
                                    </MenuItem>)}
                            </MenuList>
                        </Paper>
                    </Grow>
                </ClickAwayListener>}
            </Popper>
            <IconButton size="small" className={dragHandleClass} onClick={() => changeLanguage(null)}><TextFieldsIcon/></IconButton>
        </Stack>;
    }

    return <TextField
        multiline fullWidth variant="filled" hiddenLabel
        value={textContent} onChange={e => setTextContent(e.target.value)}
        onBlur={commitTextContent}
        InputProps={{
            disableUnderline: true,
            sx: {
                px: 1,
                py: 0,
                [`& ${dragHandleSelector}`]: {
                    visibility: languageSelectPopup.isOpen ? "visible" : "hidden"
                },
                [`&:hover ${dragHandleSelector}`]: {
                    visibility: "visible"
                },
                backgroundColor: "transparent !important",
                ...border,
                fontSize: ({ typography }) => typography.body1.fontSize
            },
            startAdornment: <DragHandle innerRef={dragHandle} iconProps={{ sx: { mr: 1 } }} />,
            endAdornment: <IconButton size="small" className={dragHandleClass} onClick={() => changeLanguage('plaintext')}><CodeIcon/></IconButton>
        }} />;
};