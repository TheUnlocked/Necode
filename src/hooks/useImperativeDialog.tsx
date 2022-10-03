import { ComponentType, useCallback, useState } from "react";

type PublicProps<P> = Omit<Omit<P, 'open' | 'onClose'> & { onClose?(): void }, never>;
type DialogComponent<P> = ComponentType<P & { open: boolean, onClose(): void }>;

type HookResult<P extends {}> = [
    dialogElt: JSX.Element,
    openDialog: (overrideProps?: Partial<P>) => void,
    closeDialog: () => void,
    isOpen: boolean
];

export default function useImperativeDialog<P>(
    DialogComponent: DialogComponent<P>
): HookResult<PublicProps<P>>;
export default function useImperativeDialog<P>(
    DialogComponent: DialogComponent<P>,
    // see https://github.com/microsoft/TypeScript/issues/46748
    props: PublicProps<P>
): HookResult<PublicProps<P>>;
export default function useImperativeDialog(
    DialogComponent: DialogComponent<{}>,
    props?: { onClose?(): void }
): HookResult<any> {
    const [isOpen, setOpen] = useState(false);
    const [overrideProps, setOverrideProps] = useState<{}>();

    const onClose = props?.onClose;

    const open = useCallback((overrideProps?: {}) => {
        setOverrideProps(overrideProps);
        setOpen(true);
    }, []);

    const close = useCallback(() => {
        if (onClose instanceof Function) {
            onClose();
        }
        setOpen(false);
    }, [onClose]);

    return [
        // eslint-disable-next-line react/jsx-key
        <DialogComponent {...props} {...overrideProps} open={isOpen} onClose={close} />,
        open,
        close,
        isOpen
    ];
}