import 'react-reflex/styles.css';

import type { AppProps } from 'next/app';
import React from 'react';
import theme from '../src/themes/theme';
import { CssBaseline, ThemeProvider } from '@mui/material';
import Head from 'next/head';
import { MetaInfo, MetaTransformerContext } from '../src/contexts/MetaTransformerContext';
import { useMergeReducer } from '../src/util/merge-reducer';
import Editor from './editor';
import editorTheme from '../src/themes/editorTheme';
import { SessionProvider } from 'next-auth/react';
import Header from '../src/components/Header';
import { SnackbarProvider } from 'notistack';

function MyApp({ Component, pageProps }: AppProps) {
    const [meta, metaTransformer] = useMergeReducer({
        title: "MQP App",
        path: [{ label: "To be named" }]
    } as MetaInfo);

    if (Component === Editor) {
        return <ThemeProvider theme={editorTheme}>
            <CssBaseline />
            <Component {...pageProps} />
        </ThemeProvider>;
    }

    return <>
        <Head>
            <title>{meta.title}</title>
            <meta name="viewport" content="initial-scale=1, width=device-width" />
        </Head>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <MetaTransformerContext.Provider value={metaTransformer}>
            <SnackbarProvider hideIconVariant>
            <SessionProvider session={pageProps.session}>
                <Header path={meta.path} />
                <Component {...pageProps} />
            </SessionProvider>
            </SnackbarProvider>
            </MetaTransformerContext.Provider>
        </ThemeProvider>
    </>;
}
export default MyApp;
