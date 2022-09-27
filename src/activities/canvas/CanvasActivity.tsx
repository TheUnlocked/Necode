import { Card, Typography } from "@mui/material";
import { Box, styled } from "@mui/system";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ReflexContainer, ReflexElement, ReflexSplitter } from "react-reflex";
import { BrowserRunner } from "../../runner/BrowserRunner";
import dedent from "dedent-js";
import Editor from "@monaco-editor/react";
import { ActivityPageProps } from "../ActivityDescription";
import useIsSizeOrSmaller from "../../hooks/useIsSizeOrSmaller";
import CodeAlert from "../../components/CodeAlert";
import useImported from '../../hooks/useImported';
import { useMediaChannel } from '../../hooks/useRtc';
import { NetworkId } from '../../api/RtcNetwork';

const SharedCanvas = styled('canvas')({
    maxWidth: "100%",
    maxHeight: "100%",
    backgroundColor: "black"
});

export function CanvasActivity({ language }: ActivityPageProps) {
    const frameRate = 10;
    const [inboundVideoElt, setInboundVideoElt] = useState<HTMLVideoElement | null>(null);

    const [context2d, setContext2d] = useState<CanvasRenderingContext2D | null>(null);
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

    const handleVideoLoad = useCallback((video: HTMLVideoElement | null) => {
        setInboundVideoElt(video);
        if (video) {
            video.muted = true;
        }
    }, []);

    const [[inboundStream], setOutboundStream] = useMediaChannel(NetworkId.NET_0);

    const onCanvasRefChange = useCallback((canvas: HTMLCanvasElement) => {
        if (canvas) {
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = 'white';

            const ctxFnKeys = Object.entries(Object.getOwnPropertyDescriptors(CanvasRenderingContext2D.prototype))
                .flatMap(([k, d]) => d.value instanceof Function ? [k] : []);

            Object.defineProperties(ctx, Object.fromEntries(ctxFnKeys.map(k => [k, {
                get() {
                    return (CanvasRenderingContext2D.prototype as any)[k];
                },
                set() {
                    throw new Error("For your own safety, reassigning the methods of `ctx` is forbidden. " +
                        `If you really want to reassign \`ctx.${k}\`, look into \`Object.defineProperty\`.` +
                        (["fill", "stroke"].includes(k) ? `\n\nDid you mean \`ctx.${k}Style\`?` : ""));
                },
                configurable: true
            } as PropertyDescriptor])));

            Object.defineProperty(ctx, 'canvas', {
                get() {
                    throw new Error("For your own safety, `ctx.canvas` is forbidden. " +
                        'If you really want to access the `HTMLCanvasElement` object, it has id `"canvas-activity--canvas"`.');
                },
                configurable: true
            });

            setContext2d(ctx);
            setCanvas(canvas);
            setOutboundStream(canvas.captureStream(frameRate));
        }
    }, [setOutboundStream]);

    useEffect(() => {
        if (canvas) {
            setOutboundStream(canvas.captureStream(frameRate));
        }
    }, [canvas, setOutboundStream]);

    const defaultCode = useMemo(() => ({
        javascript: dedent `/**
                             * @param {Omit<CanvasRenderingContext2D, "canvas">} ctx
                             *   The rendering context of the canvas to the right.
                             * @param {HTMLVideoElement} v
                             *   A video element containing the previous user's frame.
                             *   Draw it on your canvas using \`ctx.drawImage(v, x, y, w, h)\`.
                             */
                            function draw(ctx, v) {
                                ctx.drawImage(v, 0, 0, 400, 400);
                                
                            }`,
        python3: dedent`def draw(ctx, v):
                            """
                            Draw on the canvas

                            :param ctx: The rendering context of the canvas to the right.
                            :param v: A video element containing the previous user's frame.
                                      Draw it on your canvas using \`ctx.drawImage(v, x, y, w, h)\`
                            """
                            ctx.drawImage(v, 0, 0, 400, 400)
                            
                        
                        `,
        typescript: dedent `function draw(
                                /** The rendering context of the canvas to the right. */
                                ctx: Omit<CanvasRenderingContext2D, "canvas">,
                                /** 
                                 * A video element containing the previous user's frame.
                                 * Draw it on your canvas using \`ctx.drawImage(v, x, y, w, h)\`.
                                 */
                                v: HTMLVideoElement
                            ) {
                                ctx.drawImage(v, 0, 0, 400, 400);
                                
                            }`
    } as { [language: string]: string }), []);

    const [code, setCode] = useState<string>();

    const runner = useMemo(() => {
        const runner = new BrowserRunner();
        runner.start();
        return runner;
    }, []);

    const codeGenerator = useImported(language.runnable);
    const codeToRun = code ?? defaultCode[language.name];

    useEffect(() => () => runner.shutdown(), [runner]);
    useEffect(() => {
        try {
            if (codeGenerator) {
                runner.prepareCode(codeGenerator.toRunnerCode(codeToRun, { entryPoint: 'draw' }));
            }
        }
        catch (e) {
            runner.prepareCode(undefined);
            setCodeError(e as Error);
        }
    }, [codeToRun, runner, codeGenerator]);

    const [codeError, setCodeError] = useState<Error | undefined>();

    useEffect(() => {
        if (context2d) {
            function run() {
                if (runner.isPrepared) {
                    runner.run([context2d, inboundVideoElt])
                        .then(() => setCodeError(undefined))
                        .catch(e => {
                            if (e instanceof Error) {
                                setCodeError(e);
                            }
                            else {
                                setCodeError(new Error(String(e)));
                            }
                        });
                }
            }
            const interval = setInterval(run, 1000 / frameRate);
            run();
            return () => clearInterval(interval);
        }
    }, [context2d, inboundVideoElt, runner]);

    useEffect(() => {
        if (inboundVideoElt && inboundStream) {
            try {
                inboundVideoElt.muted = true;
                inboundVideoElt.srcObject = inboundStream;
                (async () => {
                    for (let i = 0; i < 10; i++) {
                        try {
                            await inboundVideoElt.play();
                            return;
                        }
                        catch (e: any) {
                            inboundVideoElt.srcObject = inboundStream;
                            inboundVideoElt.load();
                        }
                    }
                })();
            }
            catch (e) {
                console.log(e);
            }
        }
    }, [inboundVideoElt, inboundStream]);

    const isSmallScreen = useIsSizeOrSmaller("sm");

    return <ReflexContainer orientation={isSmallScreen ? "horizontal" : "vertical"}>
        <ReflexElement flex={2}>
            <Card sx={{ height: "100%", flexGrow: 1, display: "flex", flexDirection: "column" }}>
                <Typography variant="body1" component="div" sx={{ pl: 2, pr: 1, py: 1 }}>Write code to modify the canvas!</Typography>
                <Box sx={{
                    flexGrow: 1,
                    overflow: "hidden" }}>
                    <Editor
                        theme="vs-dark"
                        options={{
                            minimap: { enabled: false },
                            "semanticHighlighting.enabled": true,
                            automaticLayout: true
                        }}
                        defaultLanguage={language.monacoName}
                        defaultValue={defaultCode[language.name]}
                        value={code}
                        onChange={v => setCode(v ?? "")} />
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
                <SharedCanvas id="canvas-activity--canvas" width={400} height={400} ref={onCanvasRefChange} />
                <video width={400} height={400} autoPlay style={{ position: "absolute", left: -1e6 }} ref={handleVideoLoad} />
            </Box>
        </ReflexElement>
    </ReflexContainer>;
}