import styled, { keyframes } from '@mui/styled-engine';
import alpha from 'color-alpha';
import { useId } from 'react';

const spinnerAnimation = keyframes`
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
`;

const svgSize = 100;
const strokeThickness = 12;
const circleDiameter = svgSize - strokeThickness;

const SpinnerCircle = styled('circle')<{ gradientId: string, visible: boolean }>`
    fill: transparent;
    stroke: url(#${props => props.gradientId});
    stroke-dasharray: ${circleDiameter * Math.PI / 2};
    stroke-linecap: round;
    stroke-width: ${strokeThickness}px;
    transition: opacity 0.5s linear;
    opacity: ${props => props.visible ? 1 : 0};
    animation: 1s linear infinite both ${spinnerAnimation};
    transform-origin: 50% 50%;
    pointer-events: none;
`;

export interface SpinnerProps {
    visible?: boolean;
    color: string;
    offsetRatio?: number;
}

export default function Spinner({ visible = true, color, offsetRatio = 0 }: SpinnerProps) {
    const gradientId = useId() + '-spinner-gradient';

    return <svg viewBox={`0 0 ${svgSize} ${svgSize}`} xmlns="http://www.w3.org/2000/svg" style={{ transform: `rotate(${360 * offsetRatio}deg)` }}>
        <defs>
            <linearGradient id={gradientId}>
                <stop offset="0%" stopColor={color} />
                <stop offset="100%" stopColor={alpha(color, 0)} />
            </linearGradient>
        </defs>
        <g>
            <SpinnerCircle cx={svgSize / 2} cy={svgSize / 2} r={circleDiameter / 2} gradientId={gradientId} visible={visible} />
        </g>
    </svg>;
}