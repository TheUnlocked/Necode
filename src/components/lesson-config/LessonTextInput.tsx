import { ClickAwayListener, Grow, IconButton, MenuItem, MenuList, Paper, Popper, Stack, TextField, Theme } from "@mui/material";
import { useState } from "react";
import { SxProps } from "@mui/system";
import { Code as CodeIcon, DragIndicator, TextFields as TextFieldsIcon } from "@mui/icons-material";
import { ConnectDragSource, useDrag } from "react-dnd"
import Editor from "@monaco-editor/react";
import { usePopupState, bindTrigger, bindPopper } from "material-ui-popup-state/hooks";
import JavascriptIcon from "../../../src/util/icons/JavascriptIcon";
import PythonIcon from "../../../src/util/icons/PythonIcon";
import { useMaybeControlled } from "../../../src/hooks/MaybeControlledHook";
import DragHandle from "./DragHandle";

const languageOptions = [
    { value: 'javascript', label: 'Javascript', icon: <JavascriptIcon/> },
    { value: 'python', label: 'Python', icon: <PythonIcon/> },
    { value: 'plaintext', label: 'Plain Text', icon: <CodeIcon/> },
] as const;

type Language = (typeof languageOptions)[number]['value'] | null;

export default function LessonTextInput(props: {
    id?: string
    language?: Language,
    onChangeLanguage?: (newLanguage: Language) => void,
    value?: string,
    onChange?: (newValue: string) => void,
    dragHandle: ConnectDragSource
}) {
    const [language, updateLanguage] = useMaybeControlled(props, 'language', 'onChangeLanguage', null);
    const [value, updateValue] = useMaybeControlled(props, 'value', 'onChange');

    const languageSelectPopup = usePopupState({
        variant: "popper",
        popupId: `language-select-popup-${props.id}`
    });

    const [editorHeight, setEditorHeight] = useState(20);
    const updateHeight = (editor: Parameters<NonNullable<Parameters<typeof Editor>[0]['onMount']>>[0]) => () => {
        const contentHeight = Math.max(20, Math.min(200, editor.getContentHeight()));
        setEditorHeight(contentHeight);
        editor.layout({ height: contentHeight, width: editor.getLayoutInfo().width })
    };

    const border = {
        borderRadius: 1,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "transparent",
        "&:hover": {
            borderColor: ({palette}) => palette.action.hover
        },
        transition: ({transitions}) => transitions.create("border-color", {
            duration: transitions.duration.shorter,
            easing: transitions.easing.easeOut
        })
    } as SxProps<Theme>;

    if (language !== null) {
        return <Stack direction="row" alignItems="center" spacing={0.5} sx={{
            px: 1,
            height: editorHeight + 16,
            overflow: "hidden",
            "& .show-on-hover": {
                visibility: languageSelectPopup.isOpen ? "visible" : "hidden"
            },
            "&:hover .show-on-hover": {
                visibility: "visible"
            },
            ...border
        }}>
            <DragHandle innerRef={props.dragHandle} iconProps={{ className: "show-on-hover", sx: { mr: 0.5 } }} />
            <Editor
                height={editorHeight}
                value={value} onChange={updateValue}
                onMount={editor => {
                    editor.onDidContentSizeChange(updateHeight(editor))
                }}
                theme="vs-dark" language={language}
                options={{
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
                }} />
            <span><IconButton size="small" className="show-on-hover" sx={{ ml: 0.5 }}
                {...bindTrigger(languageSelectPopup)}>{languageOptions.find(({value}) => language === value)?.icon ?? <CodeIcon/>}</IconButton></span>
            <Popper {...bindPopper(languageSelectPopup)}
                placement="left" transition>
                {({ TransitionProps }) => <ClickAwayListener onClickAway={() => languageSelectPopup.close()}>
                    <Grow {...TransitionProps}>
                        <Paper elevation={4}>
                            <MenuList>
                                {languageOptions.map(({value, label}) =>
                                    <MenuItem key={value} onClick={() => (languageSelectPopup.close(), updateLanguage(value))}>{label}</MenuItem>)}
                            </MenuList>
                        </Paper>
                    </Grow>
                </ClickAwayListener>}
            </Popper>
            <IconButton size="small" className="show-on-hover" onClick={() => updateLanguage(null)}><TextFieldsIcon/></IconButton>
        </Stack>
    }

    return <TextField
        multiline fullWidth variant="filled" hiddenLabel
        value={value} onChange={e => updateValue(e.target.value)}
        InputProps={{
            disableUnderline: true,
            sx: {
                px: 1,
                py: 0,
                "& .show-on-hover": {
                    visibility: languageSelectPopup.isOpen ? "visible" : "hidden"
                },
                "&:hover .show-on-hover": {
                    visibility: "visible"
                },
                backgroundColor: "transparent !important",
                ...border,
                fontSize: ({typography}) => typography.body2.fontSize
            },
            startAdornment: <DragHandle innerRef={props.dragHandle} iconProps={{ className: "show-on-hover", sx: { mr: 1 } }} />,
            endAdornment: <IconButton size="small" className="show-on-hover" onClick={() => updateLanguage("plaintext")}><CodeIcon/></IconButton>
        }} />;
};