import { Card, Typography } from "@mui/material";
import { Box, styled } from "@mui/system";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReflexContainer, ReflexElement, ReflexSplitter } from "react-reflex";
import { useRTC } from "../../hooks/WebRtcHook";
import { BrowserRunner } from "../../runner/BrowserRunner";
import dedent from "dedent-js";
import Editor from "@monaco-editor/react";
import useCodeGenerator from "../../hooks/CodeGeneratorHook";
import { ActivityPageProps } from "../ActivityDescription";
import useIsSizeOrSmaller from "../../hooks/ScreenSizeHook";
import CodeAlert from "../../components/CodeAlert";

const SharedCanvas = styled('canvas')({
    maxWidth: "100%",
    maxHeight: "100%",
    backgroundColor: "black"
});

export function CanvasActivity({
    classroomId, language, socketInfo
}: ActivityPageProps) {
    // const { data: me } = useSWR<MeResponseData>(`/api/classroom/${classroom}/me`, jsonFetcher);
    // const isInstructor = me?.response === 'ok' && me.data.attributes.role === 'Instructor';

    const [debugMsg, setDebugMsg] = useState("No debug message");

    const frameRate = 10;
    const [inboundVideoElt, setInboundVideoElt] = useState<HTMLVideoElement | null>(null);

    const [context2d, setContext2d] = useState<CanvasRenderingContext2D | null>(null);
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const [outboundMediaStream, setOutboundMediaStream] = useState<MediaStream>();
    const lastOutboundMediaStreamRef = useRef<MediaStream>();
    const [inboundMediaStream, setInboundMediaStream] = useState<MediaStream>();

    // const [participants, setParticipants] = useState(new Set<string>());

    const loadInboundVideoRef = (video: HTMLVideoElement | null) => {
        setInboundVideoElt(video);
        if (video) {
            video.muted = true;
        }
    }

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
                }
            } as PropertyDescriptor])));

            Object.defineProperty(ctx, 'canvas', {
                get() {
                    throw new Error("For your own safety, `ctx.canvas` is forbidden. " +
                        'If you really want to access the `HTMLCanvasElement` object, it has id `"canvas-activity--canvas"`.');
                }
            });

            setContext2d(ctx);
            setCanvas(canvas);
            
            const canvasMediaStream = canvas.captureStream(frameRate);
            console.log('outgoing', canvasMediaStream.getTracks());
            setOutboundMediaStream(canvasMediaStream);
        }
    }, []);

    //#region Editor and Code Running

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

    const codeGenerator = useCodeGenerator(language.name);
    const codeToRun = code ?? defaultCode[language.name];

    useEffect(() => () => runner.shutdown(), [runner]);
    useEffect(() => {
        try {
            runner.prepareCode(codeGenerator.toRunnerCode(codeToRun, { entryPoint: 'draw' }));
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

    //#endregion

    //#region Websocket and WebRTC

    type PeerInfo = { role: 'send' | 'recv' };

    const sendPeerRef = useRef<Parameters<Parameters<typeof useRTC>[1]>[0]>();
    const recvPeerRef = useRef<Parameters<Parameters<typeof useRTC>[1]>[0]>();

    const rtcContext = useRTC<PeerInfo>(socketInfo, useCallback(function onPeer(peer, info) {
        if (info.role === 'send') {
            if (sendPeerRef.current && !sendPeerRef.current.destroyed) {
                sendPeerRef.current.destroy();
            }
            sendPeerRef.current = peer;
            lastOutboundMediaStreamRef.current = undefined;

            if (canvas) {
                const canvasMediaStream = canvas.captureStream(frameRate);
                console.log('outgoing', canvasMediaStream.getTracks());
                setOutboundMediaStream(canvasMediaStream);
            }
        }
        else {
            if (recvPeerRef.current && !recvPeerRef.current.destroyed) {
                recvPeerRef.current.destroy();
            }
            peer.on('stream', stream => {
                setInboundMediaStream(stream);
            });
        }
    }, [canvas]));

    useEffect(() => {
        if (inboundVideoElt && inboundMediaStream) {
            console.log('incoming', inboundMediaStream.getTracks());
            setDebugMsg('Recieved but not playing');
            try {
                inboundVideoElt.srcObject = null;
                inboundVideoElt.load(); // need to refresh stuff, errors happen if this isn't run.
                inboundVideoElt.srcObject = inboundMediaStream;
                inboundVideoElt.muted = true;
                inboundVideoElt.play().then(() => {
                    setDebugMsg('Playing');
                }).catch((e: Error) => {
                    console.log(e);
                    setDebugMsg(`${e.name}: ${e.message}`);
                });
            }
            catch (e) {
                if (e instanceof Error) {
                    setDebugMsg(`${e.name}: ${e.message}`);
                }
                console.log(e)
            }
        }
        else {
            if (inboundVideoElt) {
                setDebugMsg('<video> element not loaded');
            }
            else {
                setDebugMsg('No incoming media stream');
            }
        }
    }, [inboundVideoElt, inboundMediaStream]);

    useEffect(() => {
        if (sendPeerRef.current && outboundMediaStream) {
            if (lastOutboundMediaStreamRef.current) {
                sendPeerRef.current.replaceTrack(
                    lastOutboundMediaStreamRef.current.getVideoTracks()[0],
                    outboundMediaStream.getVideoTracks()[0],
                    lastOutboundMediaStreamRef.current
                );
            }
            else {
                sendPeerRef.current.addStream(outboundMediaStream);
            }
            lastOutboundMediaStreamRef.current = outboundMediaStream;
        }
    }, [outboundMediaStream]);

    // useEffect(() => {
    //     if (me?.response === 'ok' && rtcContext && rtcContext.authLevel >= AuthLevel.Instructor) {
    //         const ws = tracked(rtcContext.ws);
    //         ws.on('userJoin', user => {
    //             setParticipants(p => p.add(user as string));
    //         });
    //         ws.on('userLeave', user => {
    //             setParticipants(p => (p.delete(user as string), p));
    //         });
    //         rtcContext.getParticipants().then(x => setParticipants(new Set(x as string[])));
    //         return () => ws.offTracked();
    //     }
    // }, [rtcContext, me]);

    //#endregion

    const isSmallScreen = useIsSizeOrSmaller("sm");

    return <ReflexContainer orientation={isSmallScreen ? "horizontal" : "vertical"}>
        <ReflexElement flex={2}>
            <Card sx={{ height: "100%", flexGrow: 1, display: "flex", flexDirection: "column" }}>
                <Typography variant="body1" component="div" sx={{ pl: 2, pr: 1, py: 1 }}>Write code to modify the canvas!</Typography>
                <Typography>{debugMsg}</Typography>
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
                <video width={400} height={400} autoPlay style={{ position: "absolute", left: -1e6 }} ref={loadInboundVideoRef} />
            </Box>
        </ReflexElement>
    </ReflexContainer>;
}