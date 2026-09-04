import { useEffect, useRef, useState } from 'react';
import { Importable } from '~utils/types';
import useChanged from './useChanged';

export default function useImported<T>(importable: Importable<T> | undefined): T | undefined {
    const [value, setValue] = useState<T>();
    const sameImportableRef = useRef<symbol>();

    // Potentially more efficient than calling setValue(undefined) in the effect.
    // See https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
    if (useChanged(importable)) {
        setValue(undefined);
    }

    useEffect(() => {
        if (importable) {
            const importableSym = Symbol();
            sameImportableRef.current = importableSym;
            importable().then(v => {
                if (sameImportableRef.current === importableSym) {
                    setValue(() => v);
                }
            });
        }
    }, [importable]);

    return value;
}