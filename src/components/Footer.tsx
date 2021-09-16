import { Divider, Link, List, ListItem, Stack } from "@mui/material";
import { Box } from "@mui/system";

export default function Footer() {
    return <footer>
        <Box sx={{
            position: "absolute",
            bottom: 0,
            width: "100%",
        }}>
            <Divider />
            <Stack component="section" spacing={6} direction="row" sx={{
                margin: ({spacing}) => `${spacing(4)} auto`,
                maxWidth: "md"
            }}>
                <Stack component="article" direction="column" spacing={1}>
                    <List>
                        <ListItem>Github Link Here</ListItem>
                    </List>
                </Stack>
                <Stack component="article" direction="column" spacing={1}>
                    <List>
                        <ListItem><Link color="inherit" fontWeight="500" href="https://github.com/TheUnlocked">Made by Trevor Paley</Link></ListItem>
                        <ListItem><Link color="inherit" fontWeight="500" href="https://charlie-roberts.com/">Advised by Charlie Roberts</Link></ListItem>
                    </List>
                </Stack>
            </Stack>
        </Box>
    </footer>;
}