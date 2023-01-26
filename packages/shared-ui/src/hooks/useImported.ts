import { useEffect, useRef, useState } from 'react';
import { Importable } from '~utils/types';

export default function useImported<T>(importable: Importable<T> | undefined): T | undefined {
    const [value, setValue] = useState<T>();
    const sameImportableRef = useRef<symbol>();

    useEffect(() => {
        const importableSym = Symbol();
        sameImportableRef.current = importableSym;
        setValue(undefined);
        importable?.().then(v => {
            if (sameImportableRef.current === importableSym) {
                setValue(() => v);
            }
        });
    }, [importable]);

    return value;
}