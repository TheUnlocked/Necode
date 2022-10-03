import { styled } from "@mui/material";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef } from "react";
import iframeHtml from "raw-loader!./iframe.html";
import testScaffoldingImpl from "raw-loader!./test-scaffolding-impl.js.raw";
import transformTestScaffolding from "../../languages/transformers/babel-plugin-transform-test-scaffolding";
import { SxProps } from "@mui/system";
import { assignRef, SimpleRef } from "../../util/simpleRef";
import { typescriptDescription } from '../../languages/typescript';

const Iframe = styled('iframe')``;

export type RunTestsCallback = (
    tests: string,
    startTests: () => void,
    finishTests: (errorMessage?: string) => void
) => Promise<void>;

export interface ActivityIframeProps {
    htmlTemplate?: string; 
    html?: string;
    css?: string;
    js?: string;

    reloadRef?: SimpleRef<(() => Promise<void>) | undefined>;
    runTestsRef?: SimpleRef<RunTestsCallback | undefined>;

    sx: SxProps;
}

export function ActivityIframe({
    htmlTemplate,
    html,
    css,
    js,
    reloadRef,
    runTestsRef,
    sx
}: ActivityIframeProps) {

    const iframeRef = useRef<HTMLIFrameElement | null>(null);

    const changeCssRef = useRef<(value: string) => void>(() => {});

    const signatureRef = useRef<string>();

    const reload = useCallback((options?: { html?: string, js?: string, css?: string }) => {
        let isResolved = false;

        return new Promise<void>(resolve => {
            const iframeElt = iframeRef.current;
            if (iframeElt) {
                const signature = nanoid();
                signatureRef.current = signature;
                
                iframeElt.srcdoc = iframeHtml.replace('!!SIGNATURE!!', signature);
        
                const listener = (ev: MessageEvent<any>) => {
                    if (ev.data?.type === 'activity-iframe-loaded') {
                        if (ev.data.signature !== signature) {
                            return;
                        }
                        
                        window.removeEventListener('message', listener);
    
                        if (!iframeElt.contentWindow) {
                            // iframe is probably gone already
                            return;
                        }
    
                        iframeElt.contentWindow!.postMessage({
                            type: 'initialize',
                            signature,
                            template: htmlTemplate ?? '',
                            html: options?.html ?? html,
                            js: options?.js ?? js,
                            css: options?.css ?? css
                        }, '*');
    
                        const applyChanges = (type: 'html' | 'css' | 'js', value: string) => {
                            iframeElt!.contentWindow!.postMessage({ type, value, signature }, '*');
                        };
    
                        changeCssRef.current = v => applyChanges('css', v);

                        isResolved = true;
                        resolve();
                    }
                };
    
                window.addEventListener('message', listener);
                setTimeout(() => {
                    if (!isResolved) {
                        isResolved = true;
                        resolve();
                    }
                    // Clean up just in case the event listener wasn't removed.
                    // After 5 seconds it should've loaded already.
                    // Normal useEffect cleanup doesn't work since the dependencies
                    // could change before the event listener fires normally.
                    window.removeEventListener('message', listener);
                }, 5000);
            }
        });
    }, [htmlTemplate, html, js, css]);

    const internalReloadRef = useRef(reload);

    useEffect(() => {
        internalReloadRef.current = reload;
    }, [reload]);

    useEffect(() => {
        internalReloadRef.current({ html, js });
    }, [html, js]);

    useEffect(() => {
        changeCssRef.current(css ?? '');
    }, [css]);

    const runTests = useCallback<RunTestsCallback>(async (tests, startTests, finishTests) => {
        const iframeElt = iframeRef.current!;
        await reload();
        return new Promise<void>(async resolve => {
            try {
                const runner = await typescriptDescription.runnable!();
                const code = testScaffoldingImpl + runner.toRunnerCode(tests, {
                    global: true,
                    isolated: true,
                    babelPlugins: [transformTestScaffolding],
                });
    
                iframeElt.contentWindow!.postMessage({ type: 'tests', signature: signatureRef.current, code }, '*');
    
                startTests();
                let finished = false;
    
                const testResultsListener = (ev: MessageEvent<any>) => {
                    const data = ev.data;
                    if (data?.signature === signatureRef.current && data.type === 'test-results') {
                        window.removeEventListener('message', testResultsListener);
                        finished = true;
                        console.log(data.success ? 'Passed all tests' : 'Failed test');
                        if (data.success) {
                            finishTests();
                        }
                        else {
                            console.log(data.message);
                            finishTests(data.message);
                        }
                        reload();
                        return resolve();
                    }
                };
    
                window.addEventListener('message', testResultsListener);
                setTimeout(() => {
                    if (!finished) {
                        window.removeEventListener('message', testResultsListener);
                        finishTests('Tests timed out');
                        console.log('Tests timed out');
                        reload();
                        return resolve();
                    }
                }, 10000);
            }
            catch (e) {
                console.log(e);
            }
            return resolve();
        });
    }, [reload]);

    useEffect(() => {
        assignRef(reloadRef, reload);
    }, [reloadRef, reload]);
    
    useEffect(() => {
        assignRef(runTestsRef, runTests);
    }, [runTestsRef, runTests]);

    const onIframeLoad = useCallback((elt: HTMLIFrameElement | null) => {
        if (elt && iframeRef.current !== elt) {
            iframeRef.current = elt;
            reload();
        }
    }, [reload]);

    return <Iframe ref={onIframeLoad} sandbox="allow-scripts" sx={sx} />;
}
