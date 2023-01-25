import { TextField, Tooltip } from '@mui/material';
import { useState } from 'react';
import type { Configuration } from '.';
import DefaultActivityWidget from '../../components/lesson-config/DefaultActivityWidget';
import { ActivityConfigWidgetProps } from '../ActivityDescription';

function validate(str: string) {
    const value = +str;
    if (isNaN(value)) {
        return 'Must be a number';
    }
    if (value % 1 !== 0) {
        return 'Must be an integer';
    }
    if (value < 300) {
        return 'Must be at least 300';
    }
    if (value > 1200) {
        return 'Cannot be larger than 1200';
    }
    return false;
}

export function CanvasWidget(props: ActivityConfigWidgetProps<Configuration>) {
    const config = props.activityConfig ?? { canvasWidth: 400, canvasHeight: 400 };
    
    const [canvasWidth, setCanvasWidth] = useState(config.canvasWidth.toString());
    const [canvasHeight, setCanvasHeight] = useState(config.canvasHeight.toString());

    const widthValidationResult = validate(canvasWidth);
    const heightValidationResult = validate(canvasHeight);

    function commit() {
        if (!widthValidationResult && !heightValidationResult) {
            props.onActivityConfigChange({
                canvasWidth: +canvasWidth,
                canvasHeight: +canvasHeight,
            });
        }
    }

    return <DefaultActivityWidget {...props}>
        Canvas size:
        <Tooltip open={Boolean(widthValidationResult)} title={widthValidationResult} arrow>
            <TextField size="small" error={Boolean(widthValidationResult)} value={canvasWidth} onChange={ev => {
                if (/^[0-9]{0,4}$/.test(ev.target.value)) {
                    setCanvasWidth(ev.target.value);
                }
            }} onBlur={commit} InputProps={{ endAdornment: <>px</> }} inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', size: 2 }} />
        </Tooltip>
        x
        <Tooltip open={Boolean(heightValidationResult)} title={heightValidationResult} arrow>
            <TextField size="small" error={Boolean(heightValidationResult)} value={canvasHeight} onChange={ev => {
                if (/^[0-9]{0,4}$/.test(ev.target.value)) {
                    setCanvasHeight(ev.target.value);
                }
            }} onBlur={commit} InputProps={{ endAdornment: <>px</> }} inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', size: 2 }} />
        </Tooltip>
    </DefaultActivityWidget>;
}