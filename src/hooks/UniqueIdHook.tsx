import { useEffect, useState } from "react";

let counter = 0;

export function useUniqueId(base: string) {
    const [id, setId] = useState<string>();

    useEffect(() => {
        setId(`--unqiue-${counter++}`);
    }, []);

    return id;
}