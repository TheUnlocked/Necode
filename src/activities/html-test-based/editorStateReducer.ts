// Temporary, will be replaced with generalized alternative
export type EditorType = 'html' | 'css' | 'code';

export type EditorStateDispatchAction = { target: EditorType } &
    ( { type: 'initialize', value: string }
    | { type: 'valueChange', value: string }
    | { type: 'applyChanges', resolve?: (state: EditorState) => void, reject?: (reason: 'nochange') => void });

export type EditorState = {
    readonly isDirty: boolean;
    readonly uncommittedValue: string;
    readonly value: string;
};

export const editorStateReducer = (state: {
    html?: EditorState,
    code?: EditorState,
    css?: EditorState,
}, action: EditorStateDispatchAction) => {
    switch (action.type) {
        case 'initialize':
            return {...state, [action.target]: {
                isDirty: false,
                uncommittedValue: action.value,
                value: action.value
            } as EditorState};
        case 'valueChange':
            return {...state, [action.target]: {
                ...state[action.target],
                isDirty: true,
                uncommittedValue: action.value
            } as EditorState};
        case 'applyChanges':
            if (state[action.target]?.isDirty) {
                const newState = {
                    ...state[action.target]!,
                    value: state[action.target]!.uncommittedValue,
                    isDirty: false
                } as EditorState;
                action.resolve?.(newState);
                return {...state, [action.target]: newState};
            }
            else {
                action.reject?.('nochange');
            }
            return state;
    }
};