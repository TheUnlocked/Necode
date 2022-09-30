import { Card } from "@mui/material";
import { Box } from "@mui/system";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReflexContainer, ReflexElement, ReflexSplitter } from "react-reflex";
import dedent from "dedent-js";
import Editor from "@monaco-editor/react";
import { ActivityPageProps } from "../ActivityDescription";
import useIsSizeOrSmaller from "../../hooks/useIsSizeOrSmaller";
import CodeAlert from "../../components/CodeAlert";
import useImported from '../../hooks/useImported';
import { useMediaChannel } from '../../hooks/useRtc';
import { NetworkId } from '../../api/RtcNetwork';
import typeDeclarationFiles from '../p5js/typeDeclarationFiles';
import { LazyImportable } from '../../components/Lazy';
import Video from '../../components/Video';

const importExtraLibs = () => Promise.all(typeDeclarationFiles.map(async x => ({ filePath: x, content: await (await fetch(x)).text() })));

const FRAME_RATE = 10;

export function Activity({ language }: ActivityPageProps) {
    const [[inboundStream], setOutboundStream] = useMediaChannel(NetworkId.NET_0, 'canvas');

    const defaultCode = useMemo(() => dedent
       `function setup() {
            // No need to create a canvas, we'll do that for you. :)
        }
        
        function draw() {
            image(PREV_FRAME, 0, 0, 400, 400);
            
        }`, []
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
                        body { margin: 0; }
                        canvas { display: block; }
                    </style>
                    <script>
                        window.addEventListener('error', ({ error }) => {
                            window.frameElement.dispatchEvent(new CustomEvent('p5-error', { detail: error }));
                        });
                    </script>
                    <script src="https://cdn.jsdelivr.net/npm/p5@1.4.2/lib/p5.js"></script>
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
                            createCanvas(400, 400);
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
    }, [codeToRun, codeGenerator]);

    const videoRef = useRef<HTMLVideoElement | null>(null);

    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
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
                    canvas?.getContext('2d')?.drawImage(p5Canvas, 0, 0, 400, 400);
                }, 1000 / FRAME_RATE / 2);
                if (videoRef.current) {
                    frameWindow.PREV_FRAME = new frameWindow.p5.MediaElement(videoRef.current);
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
    }, [canvas, iframe]);

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
                            }}
                            defaultLanguage={language.monacoName}
                            defaultValue={defaultCode}
                            value={code}
                            onMount={(editor, monaco) => {
                                if (extraLibs) {
                                    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
                                        ...monaco.languages.typescript.javascriptDefaults.getCompilerOptions(),
                                        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs
                                    });
                                    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
                                        ...monaco.languages.typescript.typescriptDefaults.getCompilerOptions(),
                                        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs
                                    });
                            
                                    monaco.languages.typescript.javascriptDefaults.setExtraLibs(extraLibs);
                                    monaco.languages.typescript.typescriptDefaults.setExtraLibs(extraLibs);
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
                <iframe style={{ width: 400, height: 400, border: 0 }} srcDoc={iframeSource} ref={setIframe} />
                <canvas width={400} height={400} style={{ position: "absolute", left: -1e6 }} ref={setCanvas} />
                <Video width={400} height={400} style={{ position: "absolute", left: -1e6 }}
                    muted autoPlay srcObject={inboundStream} ref={videoRef} />
            </Box>
        </ReflexElement>
    </ReflexContainer>;
}