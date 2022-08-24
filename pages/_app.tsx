import 'react-reflex/styles.css';
import 'highlight.js/styles/vs2015.css';
import '../src/styles/hljs.scss';

import type { AppProps } from 'next/app';
import React, { useMemo, useRef } from 'react';
import theme from '../src/themes/theme';
import { CssBaseline, ThemeProvider } from '@mui/material';
import Head from 'next/head';
import Header from '../src/components/Header';
import { SnackbarProvider } from 'notistack';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Box, SxProps } from '@mui/system';
import LoadingContext, { LoadingContextInfo } from '../src/api/client/LoadingContext';
import { callWith } from '../src/util/fp';
import LoadingSpinners from '../src/components/LoadingSpinners';
import CustomAdapterLuxon from '../src/util/CustomLuxonAdapter';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorBoundaryPage from '../src/components/ErrorBoundaryPage';
import usePageTitle from '../src/hooks/PageTitleHook';

function MyApp({ Component, pageProps }: AppProps) {
    const loadingInfoRef = useRef({
        downloads: 0,
        uploads: 0,
        downloadListeners: [] as ((downloaders: number) => void)[],
        uploadListeners: [] as ((uploaders: number) => void)[]
    });

    const loadingContext = useMemo(() => ({
        startDownload: () => loadingInfoRef.current.downloadListeners.forEach(callWith(++loadingInfoRef.current.downloads)),
        finishDownload: () => loadingInfoRef.current.downloadListeners.forEach(callWith(--loadingInfoRef.current.downloads)),
        startUpload: () => loadingInfoRef.current.uploadListeners.forEach(callWith(++loadingInfoRef.current.uploads)),
        finishUpload: () => loadingInfoRef.current.uploadListeners.forEach(callWith(--loadingInfoRef.current.uploads)),
        addDownloadListener: listener => loadingInfoRef.current.downloadListeners.push(listener),
        addUploadListener: listener => loadingInfoRef.current.uploadListeners.push(listener),
        removeDownloadListener: listener => loadingInfoRef.current.downloadListeners.splice(
            loadingInfoRef.current.downloadListeners.indexOf(listener), 1),
        removeUploadListener: listener => loadingInfoRef.current.uploadListeners.splice(
            loadingInfoRef.current.uploadListeners.indexOf(listener), 1),
    } as LoadingContextInfo), []);

    // if (Component === Editor) {
    //     return <ThemeProvider theme={editorTheme}>
    //         <CssBaseline />
    //         <Component {...pageProps} />
    //     </ThemeProvider>;
    // }

    return <>
        <Head>
            <title>{usePageTitle()}</title>
            <meta name="viewport" content="initial-scale=1, width=device-width" />
            <meta name="color-scheme" content="dark light" />
        </Head>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <LocalizationProvider dateAdapter={CustomAdapterLuxon}>
            <SnackbarProvider hideIconVariant>
            <DndProvider backend={HTML5Backend}>
            <LoadingContext.Provider value={loadingContext}>
                <Header />
                <Box sx={{
                    "--header-height": "64px",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: "calc(100vh - 64px)"
                } as SxProps}>
                <ErrorBoundary FallbackComponent={ErrorBoundaryPage}>
                    <Component {...pageProps} />
                </ErrorBoundary>
                </Box>
                <LoadingSpinners />
            </LoadingContext.Provider>
            </DndProvider>
            </SnackbarProvider>
            </LocalizationProvider>
        </ThemeProvider>
    </>;
}
export default MyApp;
