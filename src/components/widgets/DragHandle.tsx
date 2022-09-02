import { DragIndicator } from "@mui/icons-material";
import { SvgIconTypeMap } from "@mui/material";
import { DefaultComponentProps } from "@mui/material/OverridableComponent";
import { Box, BoxTypeMap } from "@mui/system";
import { omit } from 'lodash';
import { Ref } from "react";

export const dragHandleClass = 'DragHandle-svg-icon';
export const dragHandleSelector = `.${dragHandleClass}`;

export default function DragHandle(props: Omit<DefaultComponentProps<BoxTypeMap<{}, "div">>, 'ref'> & {
    innerRef?: Ref<unknown>,
    iconProps?: DefaultComponentProps<SvgIconTypeMap<{}, "svg">>
}) {
    return <Box ref={props.innerRef} {...omit(props, ['iconProps', 'innerRef'])}
        sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            ...props.sx ?? {}
        }}>
        <DragIndicator {...props.iconProps} className={`${props.className} ${dragHandleSelector.slice(1)}`} sx={{
            [`&${dragHandleSelector}`]: {
                visibility: "hidden"
            },
            color: "rgba(255, 255, 255, 0.5)",
            cursor: "grab",
            ...props.iconProps?.sx ?? {}
        }} />
    </Box>;
}