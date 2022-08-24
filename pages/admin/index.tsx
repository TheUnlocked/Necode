import { Alert, Container, Link, Typography } from "@mui/material";
import NextLink from "next/link";
import Footer from "../../src/components/Footer";

const pages = [
    '/admin/createClassroom',
    '/admin/users',
    '/admin/simulation',
].sort();

export default function AdminPage() {
    return <>
        <Container maxWidth="sm">
            <Typography variant="h1">Admin Pages</Typography>

            <p>
                <Alert severity="info" variant="filled">These pages are only accessible to administrators</Alert>
            </p>

            <ul>
                {pages.map(x => <li key={x}><Link><NextLink href={x}>{x}</NextLink></Link></li>)}
            </ul>
        </Container>
        <Footer />
    </>;
}