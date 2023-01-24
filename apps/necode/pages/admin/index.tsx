import { Alert, Container, Link, Typography } from "@mui/material";
import NextLink from "next/link";
import Footer from "common/components/Footer";

const pages = [
    '/admin/createClassroom',
    '/admin/users',
    '/admin/simulation',
].sort();

export default function AdminPage() {
    return <>
        <Container maxWidth="sm">
            <Typography variant="h1" sx={{ mb: 2 }}>Admin Pages</Typography>
            <Alert severity="info" variant="filled">These pages are only accessible to administrators</Alert>

            <ul>
                {pages.map(x => <li key={x}><NextLink href={x} passHref legacyBehavior><Link>{x}</Link></NextLink></li>)}
            </ul>
        </Container>
        <Footer />
    </>;
}