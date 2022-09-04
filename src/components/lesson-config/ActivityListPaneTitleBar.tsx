import { CardContent, TextField, Typography } from '@mui/material';
import useLocalCachedState from '../../hooks/useLocalCachedState';
import { Iso8601Date, toLuxon } from '../../util/iso8601';

export interface AcitivityListPaneTitleBarProps {
    date: Iso8601Date;
    displayName: string;
    onDisplayNameChange: (displayName: string) => void;
}

export default function AcitivityListPaneTitleBar({
    date,
    displayName: _displayName,
    onDisplayNameChange,
}: AcitivityListPaneTitleBarProps) {
    const [displayName, setDisplayName, commitDisplayName] = useLocalCachedState(_displayName, onDisplayNameChange);

    return <CardContent>
        <TextField placeholder="New Lesson"
            variant="standard"
            hiddenLabel
            fullWidth
            value={displayName}
            onBlur={commitDisplayName}
            onChange={e => setDisplayName(e.target.value)}
            InputProps={{ disableUnderline: true, sx: ({ typography, transitions }) => ({
                ...typography.h6,
                "&:hover:after": {
                    backgroundColor: ({palette}) => palette.action.hover,
                    borderRadius: 1
                },
                "&:after": {
                    content: "''",
                    position: "absolute",
                    width: ({ spacing }) => `calc(100% + ${spacing(2)})`,
                    height: "100%",
                    pointerEvents: "none",
                    mx: -1,
                    borderRadius: 1,
                    transition: transitions.create("background-color", {
                        duration: transitions.duration.shorter,
                        easing: transitions.easing.easeOut
                    })
                }
            }) }} />
        <Typography variant="body2" component="span">{toLuxon(date).toFormat("DDDD")}</Typography>
    </CardContent>
}