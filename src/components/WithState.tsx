import { useState } from "react";

export interface WithStateProps<T> {
    initialState?: T;
    children: (state: T | undefined, setState: (newVal: T | ((old: T | undefined) => T)) => void) => JSX.Element;
}

export default function WithState<T>(props: WithStateProps<T>) {
    const [state, setState] = useState(props.initialState);

    return props.children(state, setState);
}