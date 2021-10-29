import { Alert, Card, Typography } from "@mui/material";
import { Box, styled } from "@mui/system";
import { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReflexContainer, ReflexElement, ReflexSplitter } from "react-reflex";
import { AuthLevel } from "../../../websocketServer/src/types";
import { useRTC } from "../../hooks/WebRtcHook";
import { Javascript } from "../../languages/javascript";
import { BrowserRunner } from "../../runner/BrowserRunner";
import useSWR from "swr";
import { ResponseData as MeResponseData } from "../../../pages/api/classroom/[classroom]/me";
import { useRouter } from "next/router";
import { jsonFetcher } from "../../util/fetch";
import { Python3 } from "../../languages/python3";
import dedent from "dedent-js";
import tracked from "../../util/trackedEventEmitter";
import Editor from "@monaco-editor/react";

const SharedCanvas = styled('canvas')({
    maxWidth: "100%",
    maxHeight: "100%",
    backgroundColor: "black"
});

function fancyError(message: string) {
    const result = [] as (string | ReactElement)[];
    let buffer = '';
    let mode = 'normal' as 'normal' | 'code';
    function clearBuffer(newMode: typeof mode) {
        if (buffer) {
            if (mode === 'normal') {
                result.push(buffer);
            }
            else {
                result.push(<code style={{ whiteSpace: 'pre' }}>{buffer}</code>);
            }
        }
        mode = newMode;
        buffer = '';
    }
    for (const ch of message) {
        switch (ch) {
            case '`':
                clearBuffer(mode === 'code' ? 'normal' : 'code');
                break;
            case '\n':
                if (mode === 'normal') {
                    clearBuffer('normal');
                    result.push(<br />);
                    break;
                }
            default:
                buffer += ch;
        }
    }
    clearBuffer('normal');
    return result;
}

export function CanvasActivity(props: {
    classroom: string
}) {
    const router = useRouter();
    const { data: me } = useSWR<MeResponseData>(`/api/classroom/${router.query.classroom}/me`, jsonFetcher);
    const isInstructor = me?.response === 'ok' && me.data.attributes.role === 'Instructor';

    const frameRate = 10;
    const incomingVideoRef = useRef<HTMLVideoElement>(null);

    const [context2d, setContext2d] = useState<CanvasRenderingContext2D | null>(null);
    const [canvasMediaStream, setCanvasMediaStream] = useState<MediaStream>();

    const [participants, setParticipants] = useState(new Set<string>());

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
            setCanvasMediaStream(canvas.captureStream(frameRate))
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
                               \ 
                            }`,
        python: dedent `def draw(ctx, v):
                            """
                            Draw on the canvas

                            :param ctx: The rendering context of the canvas to the right.
                            :param v: A video element containing the previous user's frame.
                                      Draw it on your canvas using \`ctx.drawImage(v, x, y, w, h)\`
                            """
                            ctx.drawImage(v, 0, 0, 400, 400)
                            
                        
                        `,
    }), []);

    const [code, setCode] = useState(defaultCode.javascript);

    useEffect(() => {
        switch (router.query.language) {
            case 'python3':
                setCode(defaultCode.python);
                break;
            case 'javascript':
                setCode(defaultCode.javascript);
                break;
        }
    }, [router.query.language, defaultCode]);

    const runner = useMemo(() => {
        const runner = new BrowserRunner();
        runner.start();
        return runner;
    }, []);
    
    useEffect(() => () => runner.shutdown(), [runner]);
    useEffect(() => {
        try {
            switch (router.query.language) {
                case 'python3':
                    runner.prepareCode(new Python3().toRunnerCode(code, { entryPoint: 'draw' }));
                    break;
                default:
                    runner.prepareCode(new Javascript().toRunnerCode(code, { entryPoint: 'draw' }));
            }
        }
        catch (e) {
            runner.prepareCode(undefined);
            setCodeError(e as Error);
        }
    }, [code, runner, router.query.language]);

    const [codeError, setCodeError] = useState<Error | null>(null);

    useEffect(() => {
        if (context2d) {
            function run() {
                if (incomingVideoRef.current) {
                    // context2d!.drawImage(incomingVideoRef.current, 0, 0, 400, 400);
                }
                if (runner.isPrepared) {
                    runner.run([context2d, incomingVideoRef.current])
                        .then(() => setCodeError(null))
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
    }, [context2d, runner]);

    //#endregion

    //#region Websocket and WebRTC

    type PeerInfo = { role: 'send' | 'recv' };

    const sendPeerRef = useRef<Parameters<Parameters<typeof useRTC>[1]>[0]>();
    const recvPeerRef = useRef<Parameters<Parameters<typeof useRTC>[1]>[0]>();

    const rtcContext = useRTC<PeerInfo>(props.classroom, useCallback(function onPeer(peer, info) {
        if (info.role === 'send') {
            if (sendPeerRef.current && !sendPeerRef.current.destroyed) {
                sendPeerRef.current.destroy();
            }
            sendPeerRef.current = peer;
            peer.addStream(canvasMediaStream!);
        }
        else {
            if (recvPeerRef.current && !recvPeerRef.current.destroyed) {
                recvPeerRef.current.destroy();
            }
            peer.on('stream', stream => {
                if (incomingVideoRef.current) {
                    incomingVideoRef.current.srcObject = stream;
                }
            });
        }
    }, [canvasMediaStream]));

    useEffect(() => {
        if (me?.response === 'ok' && rtcContext && rtcContext.authLevel >= AuthLevel.Instructor) {
            const ws = tracked(rtcContext.ws);
            ws.on('userJoin', user => {
                setParticipants(p => p.add(user as string));
            });
            ws.on('userLeave', user => {
                setParticipants(p => (p.delete(user as string), p));
            });
            rtcContext.getParticipants().then(x => setParticipants(new Set(x as string[])));
            return () => ws.offTracked();
        }
    }, [rtcContext, me]);

    //#endregion

    const editorCard = <Card sx={{ height: "100%", flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <Typography variant="body1" component="div" sx={{ pl: 2, pr: 1, py: 1 }}>Write code to modify the canvas!</Typography>
        <Box sx={{ flexGrow: 1 }}>
            <Editor
                theme="vs-dark" options={{
                    minimap: { enabled: false },
                    "semanticHighlighting.enabled": true
                }}
                defaultLanguage={{
                    javascript: 'javascript',
                    python3: 'python'
                }[router.query.language as string | undefined ?? 'javascript']}
                value={code}
                onChange={v => setCode(v ?? "")} />
        </Box>
        <Alert severity={codeError ? "error" : "success"} sx={{ wordBreak: "break-word" }}>
            {codeError
                ? <>{`${codeError.name}: `}{fancyError(codeError.message)}</>
                : "Your code ran successfully!"}
        </Alert>
    </Card>;

    return <Box sx={{
            px: 2,
            pb: 2,
            height: "100%",
            "& .reflex-container > .reflex-element": {
                overflow: "hidden"
            }
        }}>
        <ReflexContainer orientation="vertical">
            <ReflexElement flex={2} minSize={500}>
                {isInstructor
                    ? editorCard
                    // ? <ReflexContainer style={{ height: "100%" }} orientation="horizontal">
                    //     <ReflexElement flex={3} minSize={250}>{editorCard}</ReflexElement>
                    //     <ReflexSplitter/>
                    //     <ReflexElement flex={1}>
                    //         <Card sx={{ height: "100%", overflow: "auto" }}>
                    //             <List>
                    //                 {[...participants].map(p => <ListItemButton key={p}>
                    //                     {p}
                    //                 </ListItemButton>)}
                    //             </List>
                    //         </Card>
                    //     </ReflexElement>
                    // </ReflexContainer>
                    : editorCard}
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
                    <video width={400} height={400} style={{ display: "none" }} autoPlay={true} ref={incomingVideoRef} />
                </Box>
            </ReflexElement>
        </ReflexContainer>
    </Box>;
}