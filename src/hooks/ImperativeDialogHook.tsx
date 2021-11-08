import { ComponentType, useState } from "react";

type HookResult = [
    JSX.Element,
    () => void,
    () => void,
    boolean
];

export default function useImperativeDialog(
    DialogComponent: ComponentType<{ open: boolean, onClose(): void }>
): HookResult;
export default function useImperativeDialog<P extends {}>(
    DialogComponent: ComponentType<{ open: boolean, onClose(): void } & P>,
    props?: Omit<P, 'open' | 'onClose'>
): HookResult;
export default function useImperativeDialog(
    DialogComponent: ComponentType<{ open: boolean, onClose(): void }>,
    props?: any
) {
    const [isOpen, setOpen] = useState(false);

    function open() {
        setOpen(true);
    }

    function close() {
        setOpen(false);
    }

    return [
        // eslint-disable-next-line react/jsx-key
        <DialogComponent {...props} open={isOpen} onClose={close} />,
        open,
        close,
        isOpen
    ];
}