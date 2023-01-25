import { createTheme } from "@mui/material";
import { blue, pink } from "@mui/material/colors";

const palette = createTheme({ palette: {
    mode: 'dark',
    primary: blue,
    secondary: pink
} }).palette;

const splitterCore = '#1e1e1e';
const splitterCoreHover = palette.primary.dark;
const splitterCoreThickness = '4px';
const splitterFill = palette.background.default;
const splitterFillHover = palette.background.default;
const splitterBorderThickness = '6px';
const splitterMarginThickness = '0';

export default createTheme({
    palette,
    components: {
        MuiCssBaseline: {
            styleOverrides: `
                /* Make sure that anchor links scroll to the right place */
                :target {
                    scroll-margin-top: calc(var(--header-height) + 16px);
                }

                .monaco-hover {
                    z-index: 2000 !important;
                }

                .monaco-editor .suggest-widget {
                    z-index: 1900 !important;
                }

                .reflex-container {
                    && > .reflex-splitter {
                        background-color: ${splitterCore};
                    }
                    && > .reflex-splitter {
                        &.active, &:hover {
                            background-color: ${splitterCoreHover};
                        }
                    }

                    &&.horizontal > .reflex-splitter {
                        border-color: ${splitterFill};
                        border-width: ${splitterBorderThickness} 0;
                        padding-top: ${splitterCoreThickness};
                        margin: ${splitterMarginThickness} 0;

                        &:hover, &.active {
                            border-color: ${splitterFillHover};
                            border-width: ${splitterBorderThickness} 0;
                        }
                        &.reflex-thin {
                            border-color: ${splitterFill};
                            &.active, &:hover {
                                border-color: ${splitterFillHover};
                            }
                        }
                    }

                    &&.vertical > .reflex-splitter {
                        border-color: ${splitterFill};
                        border-width: 0 ${splitterBorderThickness};
                        padding-left: ${splitterCoreThickness};
                        margin: 0 ${splitterMarginThickness};

                        &:hover, &.active {
                            border-color: ${splitterFillHover};
                            border-width: 0 ${splitterBorderThickness};
                        }
                        &.reflex-thin {
                            border-color: ${splitterFill};
                            &.active, &:hover {
                                border-color: ${splitterFillHover};
                            }
                        }
                    }
                }
            `
        },
    }
});