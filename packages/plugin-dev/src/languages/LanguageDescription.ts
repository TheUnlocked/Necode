import { SvgIconProps } from "@mui/material";
import { ComponentType } from "react";

export interface LanguageDescription {
    readonly name: string;
    readonly monacoName: string;
    readonly displayName: string;
    readonly icon?: ComponentType<SvgIconProps>;
}
