import { PropsWithChildren } from 'react';
import { BasePaneProps } from './Pane';

export interface PassthroughPaneProps extends PropsWithChildren<BasePaneProps> {

}

export default function PassthroughPane({ children }: PassthroughPaneProps) {
    return <>{children}</>;
}