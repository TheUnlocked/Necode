import 'react-reflex/styles.css';

import type { AppProps } from 'next/app';
import React from 'react';
import theme from '../src/themes/theme';
import { CssBaseline, ThemeProvider } from '@mui/material';
import Head from 'next/head';
import { MetaInfo, TransformMetaContext } from '../src/contexts/meta-context';
import { useMergeReducer } from '../src/util/merge-reducer';
import Editor from './editor';
import editorTheme from '../src/themes/editorTheme';

function MyApp({ Component, pageProps }: AppProps) {
    const [meta, metaTransformer] = useMergeReducer({
        title: "MQP App"
    } as MetaInfo);

    return <>
        <Head>
            <title>{meta.title}</title>
            <meta name="viewport" content="initial-scale=1, width=device-width" />
        </Head>
        <ThemeProvider theme={Component === Editor ? editorTheme : theme}>
            <CssBaseline />
            <TransformMetaContext.Provider value={metaTransformer}>
                <Component {...pageProps} />
            </TransformMetaContext.Provider>
        </ThemeProvider>
    </>;
}
export default MyApp;
