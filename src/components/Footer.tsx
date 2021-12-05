import { GitHub } from "@mui/icons-material";
import { Divider, Link, List, ListItem, ListItemIcon, Stack, styled } from "@mui/material";

const RealFooter = styled("footer")`
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    justify-content: end;
    width: 100%;
`;

export default function Footer() {
    return <RealFooter style={{ flexGrow: 1 }}>
        <Divider />
        <Stack component="section" spacing={6} direction="row" sx={{
            margin: ({spacing}) => `${spacing(4)} auto`,
            width: "100%",
            maxWidth: "md"
        }}>
            <Stack component="article" direction="column" spacing={1}>
                <List>
                    <ListItem>
                        <ListItemIcon><GitHub/></ListItemIcon>
                        <Link color="inherit" fontWeight="500" href="https://github.com/TheUnlocked/Necode">View it on GitHub</Link>
                    </ListItem>
                </List>
            </Stack>
            <Stack component="article" direction="column" spacing={1}>
                <List>
                    <ListItem><Link color="inherit" fontWeight="500" href="https://github.com/TheUnlocked">Made by Trevor Paley</Link></ListItem>
                    <ListItem><Link color="inherit" fontWeight="500" href="https://charlie-roberts.com/">Advised by Charlie Roberts</Link></ListItem>
                </List>
            </Stack>
        </Stack>
    </RealFooter>;
}