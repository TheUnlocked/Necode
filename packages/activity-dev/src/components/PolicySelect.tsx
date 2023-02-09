import { MenuItem, Select } from '@mui/material';

export interface PolicySelectProps {
    value: string;
    onChange: (newValue: string) => void;
}

const options = ['noop', 'ring'] as const;

const displayNameMap = {
    ring: 'Ring',
    noop: 'None',
};

export default function PolicySelect({ value, onChange }: PolicySelectProps) {
    return <Select size="small" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(x => <MenuItem key={x} value={x}>{displayNameMap[x]}</MenuItem>)}
    </Select>;
}
