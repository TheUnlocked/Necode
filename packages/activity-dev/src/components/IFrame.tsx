import { styled, SxProps } from '@mui/material';
import { forwardRef } from 'react';

const StyledIframe = styled('iframe')({});

export interface IFrameProps extends React.DetailedHTMLProps<React.IframeHTMLAttributes<HTMLIFrameElement>, HTMLIFrameElement> {
    sx: SxProps;
}

export default forwardRef<HTMLIFrameElement, IFrameProps>(function IFrame(props, ref) {
    return <StyledIframe ref={ref} sandbox="allow-scripts" allow="cross-origin-isolated" {...props} />;
});