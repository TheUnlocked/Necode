import { Card, Box } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { ReflexContainer, ReflexElement, ReflexSplitter } from "react-reflex";
import dedent from "dedent-js";
import Editor from "@monaco-editor/react";
import { ActivityPageProps } from "../ActivityDescription";
import useIsSizeOrSmaller from "../../hooks/useIsSizeOrSmaller";
import CodeAlert from "../../components/CodeAlert";
import useImported from '../../hooks/useImported';
import { useMediaChannel } from '../../hooks/RtcHooks';
import { NetworkId } from '~api/RtcNetwork';
import typeDeclarationFiles from '../p5js/typeDeclarationFiles';
import { LazyImportable } from '../../components/Lazy';
import Video from '../../components/Video';
import { useCallback } from 'react';
import { Configuration } from '../canvas';

const importExtraLibs = () => Promise.all(typeDeclarationFiles.map(async x => ({ filePath: x, content: await (await fetch(x)).text() })));

const FRAME_RATE = 10;

export function Activity({ language, activityConfig }: ActivityPageProps<Configuration>) {
    const [[inboundStream], setOutboundStream] = useMediaChannel(NetworkId.NET_0, 'canvas');

    const config = useMemo(() => activityConfig ?? { canvasWidth: 400, canvasHeight: 400 }, [activityConfig]);

    const defaultCode = useMemo(() => dedent
       `function setup() {
            // No need to create a canvas, we'll do that for you. :)
        }
        
        function draw() {
            image(PREV_FRAME, 0, 0, ${config.canvasWidth}, ${config.canvasHeight});
            
        }`, [config]
    );

    const [code, setCode] = useState<string>();
    const codeToRun = code ?? defaultCode;

    const codeGenerator = useImported(language.runnable);
    const [codeError, setCodeError] = useState<Error | undefined>();

    const iframeSource = useMemo(() => {
        if (codeGenerator) {
            setCodeError(undefined);
            return `<html>
                <head>
                    <style>
                        body { margin: 0; background: black; }
                        canvas { display: block; }
                    </style>
                    <script>
                        window.addEventListener('error', ({ error }) => {
                            window.frameElement.dispatchEvent(new CustomEvent('p5-error', { detail: error }));
                        });
                    </script>
                    <script src="https://cdn.jsdelivr.net/npm/p5@1.4.2/lib/p5.min.js"></script>
                    <script>${codeGenerator.toRunnerCode(codeToRun, { global: true })}</script>
                </head>
                <body>
                    <main></main>
                    <script>
                    {
                        p5.disableFriendlyErrors = true;
                        const setup = window.setup;
                        window.setup = () => {
                            window.PREV_FRAME = createImage(1, 1);
                            createCanvas(${config.canvasWidth}, ${config.canvasHeight});
                            background('black');
                            window.createCanvas = () => {
                                throw new Error("We'll handle the canvas for you. :)");
                            };
                            window.resizeCanvas = () => {
                                throw new Error("In order for behind-the-scenes stuff to work correctly, we need the canvas to be a certain size. Sorry!");
                            };
                            if (setup) {
                                setup();
                            }
                            window.frameElement.dispatchEvent(new CustomEvent('p5-load', { detail: window }));
                        };
                    }
                    </script>
                </body>
            </html>
            `;
        }
        return ``;
    }, [config, codeToRun, codeGenerator]);

    const videoRef = useRef<HTMLVideoElement | null>(null);

    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const handleCanvasLoad = useCallback((canvas: HTMLCanvasElement | null) => {
        // In order to create the media stream properly on Firefox, we need to create a context first.
        canvas?.getContext('2d');
        setCanvas(canvas);
    }, []);

    useEffect(() => {
        if (canvas) {
            setOutboundStream(canvas.captureStream(FRAME_RATE));
        }
    }, [canvas, setOutboundStream]);

    const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
    useEffect(() => {
        if (iframe) {
            function loadHandler({ detail: frameWindow }: CustomEvent<Window & { p5: any, PREV_FRAME: any }>) {
                const p5Canvas = frameWindow.document.getElementById('defaultCanvas0') as HTMLCanvasElement;
                frameWindow.setInterval(() => {
                    const ctx = canvas?.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);
                        ctx.drawImage(p5Canvas, 0, 0, config.canvasWidth, config.canvasHeight);
                    }
                }, 1000 / FRAME_RATE / 2);
                if (videoRef.current) {
                    frameWindow.PREV_FRAME = new frameWindow.p5.MediaElement(videoRef.current);
                    frameWindow.PREV_FRAME.loadedmetadata = true;
                }
                else {
                    console.warn('video not yet loaded');
                }
            }

            function errorHandler({ detail }: CustomEvent<Error>) {
                setCodeError(detail);
            }

            iframe.addEventListener('p5-load', loadHandler as any);
            iframe.addEventListener('p5-error', errorHandler as any);
            return () => {
                iframe.removeEventListener('p5-load', loadHandler as any);
                iframe.removeEventListener('p5-error', errorHandler as any);
            };
        }
    }, [canvas, iframe, config]);

    const isSmallScreen = useIsSizeOrSmaller("sm");

    return <ReflexContainer orientation={isSmallScreen ? "horizontal" : "vertical"}>
        <ReflexElement flex={2}>
            <Card sx={{ height: "100%", flexGrow: 1, display: "flex", flexDirection: "column" }}>
                <Box sx={{
                    flexGrow: 1,
                    pt: 2,
                    overflow: "hidden" }}>
                    <LazyImportable show={true} importable={importExtraLibs} render={extraLibs =>
                        <Editor
                            theme="vs-dark"
                            options={{
                                minimap: { enabled: false },
                                "semanticHighlighting.enabled": true,
                                automaticLayout: true,
                                fixedOverflowWidgets: true,
                            }}
                            defaultLanguage={language.monacoName}
                            defaultValue={defaultCode}
                            value={code}
                            onMount={(editor, monaco) => {
                                const libs = [...extraLibs, { content: dedent`
                                declare const PREV_FRAME: import("https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/master/types/p5/index").Element;
                                ` }];
                                if (libs) {
                                    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
                                        ...monaco.languages.typescript.javascriptDefaults.getCompilerOptions(),
                                        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs
                                    });
                                    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
                                        ...monaco.languages.typescript.typescriptDefaults.getCompilerOptions(),
                                        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs
                                    });
                            
                                    monaco.languages.typescript.javascriptDefaults.setExtraLibs(libs);
                                    monaco.languages.typescript.typescriptDefaults.setExtraLibs(libs);
                                }
                            }}
                            onChange={v => setCode(v ?? "")} />
                    } />
                </Box>
                <CodeAlert error={codeError} />
            </Card>
        </ReflexElement>
        <ReflexSplitter/>
        <ReflexElement flex={1}>
            <Box sx={{
                height: "100%",
                width: "100%",
                pl: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
            }}>
                <iframe style={{ width: config.canvasWidth, height: config.canvasHeight, border: 0, backgroundColor: 'black' }} srcDoc={iframeSource} ref={setIframe} />
                <canvas width={config.canvasWidth} height={config.canvasHeight} style={{ position: "absolute", left: -1e6 }} ref={handleCanvasLoad} />
                <Video width={config.canvasWidth} height={config.canvasHeight} style={{ position: "absolute", left: -1e6 }}
                    muted autoPlay srcObject={inboundStream} ref={videoRef} />
            </Box>
        </ReflexElement>
    </ReflexContainer>;
}