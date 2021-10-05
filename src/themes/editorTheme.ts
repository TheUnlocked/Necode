import { createTheme } from "@mui/material";
import { blue, pink } from "@mui/material/colors";


export default createTheme({
    palette: {
        mode: 'dark',
        primary: blue,
        secondary: pink
    },
    // components: {
    //     MuiCssBaseline: {
    //         styleOverrides: `
    //             body {
    //                 background-color: unset;
    //             }
    //         `
    //     }
    // }
});