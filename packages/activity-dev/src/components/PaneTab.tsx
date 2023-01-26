import { PropsWithChildren } from 'react';

export interface PaneTabProps extends PropsWithChildren {
    label: string | JSX.Element;
    value: string;
    hidden?: boolean;
}

export default function PaneTab({ children }: PaneTabProps) {
    return children as JSX.Element;
}