import { styled } from '@mui/material';
import { PropsWithChildren } from 'react';

export default styled('div')`
    position: fixed;
    margin: 0 !important;
    pointer-events: none;
    white-space: nowrap;
    z-index: 10000;
    left: 0;
    top: 0;
    width: 100vw;
    height: 100vh;
` as React.FC<PropsWithChildren>;