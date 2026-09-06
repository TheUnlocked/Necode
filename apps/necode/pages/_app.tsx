import 'highlight.js/styles/vs2015.css';
import 'react-reflex/styles.css';
import '~ui/styles/hljs.scss';

import { Box, CssBaseline, SxProps, ThemeProvider } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { ConfirmProvider } from 'material-ui-confirm';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { SnackbarProvider } from 'notistack';
import { useMemo, useRef } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { DragDropProvider } from 'use-dnd';
import CorePlugin from '~core';
import LoadingContext, { LoadingContextInfo } from '~shared-ui/hooks/useLoadingContext';
import { PluginsProvider } from '~shared-ui/hooks/usePlugins';
import Header from '~ui/components/Header';
import ErrorBoundaryPage from '~ui/components/layouts/ErrorBoundaryPage';
import LoadingSpinners from '~ui/components/LoadingSpinners';
import usePageTitle from '~ui/hooks/usePageTitle';
import theme from '~ui/themes/theme';
import CustomAdapterLuxon from '~ui/util/CustomLuxonAdapter';
import { callWith } from '~utils/fp';

const builtinPlugins = [CorePlugin];

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

    return <>
        <Head>
            <title>{usePageTitle()}</title>
            <meta name="viewport" content="initial-scale=1, width=device-width" />
            <meta name="color-scheme" content="dark light" />
        </Head>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <LocalizationProvider dateAdapter={CustomAdapterLuxon}>
            <ConfirmProvider defaultOptions={{ confirmationText: "Yes, I'm sure" }}>
            <SnackbarProvider hideIconVariant>
            <DragDropProvider>
            <LoadingContext.Provider value={loadingContext}>
            <PluginsProvider builtinPlugins={builtinPlugins}>
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
            </PluginsProvider>
            </LoadingContext.Provider>
            </DragDropProvider>
            </SnackbarProvider>
            </ConfirmProvider>
            </LocalizationProvider>
        </ThemeProvider>
    </>;
}
export default MyApp;
