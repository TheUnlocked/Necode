import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { readFile, readdir } from 'fs/promises';
import { join, parse as parsePath } from 'path';
import { PropsWithChildren } from "react";
import { Alert, Button, Card, Checkbox, Container, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, Typography } from "@mui/material";
import { serialize } from 'next-mdx-remote/serialize';
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import Footer from "../../src/components/Footer";
import rehypeHighlight from "rehype-highlight";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkToc from "remark-toc";
import WithState from "../../src/components/WithState";
import remarkUnwrapMdx from '../../src/remark/remark-unwrap-mdx';

const h1 = (props: PropsWithChildren<{}>) => <>
    <Typography sx={{ marginTop: 6 }} variant="h3" fontWeight="500" {...props} component="h1" />
    <Divider sx={{ marginTop: 2, marginBottom: 2 }} />
</>;

const h2 = (props: PropsWithChildren<{}>) => <Typography sx={{ mt: 4, mb: 2 }} variant="h4" {...props} component="h2" />;
const h3 = (props: PropsWithChildren<{}>) => <Typography sx={{ mt: 4, mb: 2 }} variant="h5" {...props} component="h3" />;
const h4 = (props: PropsWithChildren<{}>) => <Typography sx={{ mt: 4, mb: 2 }} variant="h6" {...props} component="h4" />;

const DocsPage: NextPage<{ source: MDXRemoteSerializeResult }> = ({ source }) => {
    return <>
        <Container maxWidth="md" sx={{ mb: 8 }}>
            <MDXRemote {...source} components={{
                WithState,
                h1, h2, h3, h4,
                Typography,
                Button, Checkbox,
                Card, DialogTitle, DialogContent, DialogContentText, DialogActions,
                Alert
            }} />
        </Container>
        <Footer />
    </>;
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
    if (params) {
        const mdxSource = await readFile(join(process.cwd(), 'docs', `${params.docname}.mdx` as string), { encoding: 'utf-8' });

        return {
            props: { source: await serialize(mdxSource, {
                mdxOptions: {
                    rehypePlugins: [
                        rehypeSlug,
                        rehypeAutolinkHeadings,
                        [rehypeHighlight, { ignoreMissing: true }],
                    ],
                    remarkPlugins: [
                        remarkGfm,
                        remarkUnwrapMdx,
                        [remarkToc, { tight: true }],
                    ]
                }
            }) }
        };
    }

    return {
        notFound: true
    };
};

export const getStaticPaths: GetStaticPaths = async () => {
    const docfiles = await readdir(join(process.cwd(), 'docs'));
    
    return {
        paths: docfiles.map(x => ({
            params: { docname: parsePath(x).name }
        })),
        fallback: false
    };
};

export default DocsPage;