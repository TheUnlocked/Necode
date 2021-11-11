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
export default function useImperativeDialog<P>(
    DialogComponent: ComponentType<P>,
    // see https://github.com/microsoft/TypeScript/issues/46748
    props: Omit<Omit<P, 'open' | 'onClose'> & { onClose?: () => void }, never>
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
        if (props?.onClose instanceof Function) {
            props.onClose();
        }
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