import { DragIndicator } from "@mui/icons-material";
import { SvgIconTypeMap } from "@mui/material";
import { DefaultComponentProps } from "@mui/material/OverridableComponent";
import { Box, BoxTypeMap } from "@mui/system";
import { Ref } from "react";

export default function DragHandle(props: Omit<DefaultComponentProps<BoxTypeMap<{}, "div">>, 'ref'> & {
    innerRef?: Ref<unknown>,
    iconProps?: DefaultComponentProps<SvgIconTypeMap<{}, "svg">>
}) {
    return <Box ref={props.innerRef} {...props}
        sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            ...props.sx ?? {}
        }}>
        <DragIndicator {...props.iconProps} sx={{
            color: "rgba(255, 255, 255, 0.5)",
            cursor: "grab",
            ...props.iconProps?.sx ?? {}
        }} />
    </Box>;
}