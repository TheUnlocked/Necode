// Based on https://github.com/stevekanger/react-hstore

import { useEffect, useState } from 'react';

type GlobalStateFunctions<T> = [
    use: () => T,
    get: () => T,
    set: (newVal: T) => void
];

export default function createGlobalState<T>(value?: undefined): GlobalStateFunctions<T | undefined>;
export default function createGlobalState<T>(value: T): GlobalStateFunctions<T>;
export default function createGlobalState<T>(value?: T): GlobalStateFunctions<T | undefined> {
    let state = value;

    type Subscriber = (val: () => T | undefined) => void;
    const subscribers = new Set<Subscriber>();

    const getState = () => state;
    const notifySubscriber = (sub: Subscriber) => sub(getState);

    return [
        () => {
            const [_state, _setState] = useState(state);
            useEffect(() => {
                subscribers.add(_setState);
                return () => { subscribers.delete(_setState) };
            }, []);
            return _state;
        },
        getState,
        newVal => {
            state = newVal;
            subscribers.forEach(notifySubscriber);
        }
    ];
}