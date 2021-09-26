import { Alert, Card, CardContent, IconButton, List, ListItem, ListItemButton, Stack, Typography } from "@mui/material";
import { Box, styled } from "@mui/system";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReflexContainer, ReflexElement, ReflexSplitter } from "react-reflex";
import { AuthLevel } from "../../../websocketServer/types";
import { useIsolatedEditor } from "../../hooks/IsolatedEditorHook";
import { useRTC } from "../../hooks/WebRtcHook";
import { Javascript } from "../../languages/javascript";
import { BrowserRunner } from "../../runner/BrowserRunner";
import { useSession } from "next-auth/react";

const SharedCanvas = styled('canvas')({
    maxWidth: "100%",
    maxHeight: "100%",
    backgroundColor: "white"
});

export function CanvasActivity(props: {
    classroom: string
}) {
    const { data: session, status: sessionStatus } = useSession();

    const frameRate = 10;
    const incomingVideoRef = useRef<HTMLVideoElement>(null);

    const [context2d, setContext2d] = useState<CanvasRenderingContext2D | null>(null);
    const [canvasMediaStream, setCanvasMediaStream] = useState<MediaStream>();

    const [participants, setParticipants] = useState(new Set<string>());

    const onCanvasRefChange = useCallback((canvas: HTMLCanvasElement) => {
        if (canvas) {
            setContext2d(canvas.getContext("2d"));
            setCanvasMediaStream(canvas.captureStream(frameRate))
        }
    }, []);

    //#region Editor and Code Running

    const { Editor } = useIsolatedEditor();
    const [code, setCode] = useState("/**\n * @param {CanvasRenderingContext2D} ctx\n */\nfunction draw(ctx) {\n    \n}");

    const runner = useMemo(() => {
        const runner = new BrowserRunner();
        runner.start();
        return runner;
    }, []);
    
    useEffect(() => () => runner.shutdown(), [runner]);
    useEffect(() => {
        try {
            runner.prepareCode(new Javascript().toRunnerCode(code, { entryPoint: 'draw' }));
        }
        catch (e) {
            runner.prepareCode(undefined);
            setCodeError(e as Error);
        }
    }, [code, runner]);

    const [codeError, setCodeError] = useState<Error | null>(null);

    useEffect(() => {
        if (context2d) {
            function run() {
                if (incomingVideoRef.current) {
                    context2d!.drawImage(incomingVideoRef.current, 0, 0, 400, 400);
                }
                if (runner.isPrepared) {
                    runner.run([context2d])
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

    const peersRef = useRef<[Parameters<Parameters<typeof useRTC>[1]>[0], PeerInfo][]>([]);

    const rtcContext = useRTC<PeerInfo>(props.classroom, useCallback(function onPeer(peer, info) {
        if (canvasMediaStream) {
            for (const peer of peersRef.current) {
                onPeer(...peer);
            }
            peer.addStream(canvasMediaStream);
            peer.on('stream', stream => {
                if (incomingVideoRef.current) {
                    incomingVideoRef.current.srcObject = stream;
                }
            });
        }
        else {
            peersRef.current.push([peer, info]);
        }
    }, [canvasMediaStream]));

    useEffect(() => {
        if (rtcContext && rtcContext.authLevel >= AuthLevel.Instructor) {
            rtcContext.ws.on('userJoin', user => {
                setParticipants(p => p.add(user as string));
                // if (user !== rtcContext.username) {
                    //     rtcContext.linkParticipants(rtcContext.username, [user]);
                    // }
            });
            rtcContext.ws.on('userLeave', user => {
                setParticipants(p => (p.delete(user as string), p));
                // rtcContext.unlinkParticipants(rtcContext.username, [user]);
            });
            rtcContext.getParticipants().then(participants => {
                setParticipants(new Set(participants as string[]));
            });
        }
    }, [rtcContext]);

    //#endregion

    const isInstructor = (session?.user.authority ?? -1) >= AuthLevel.Instructor;

    const editorCard = <Card sx={{ height: "100%", flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <Typography variant="body1" component="div" sx={{ pl: 2, pr: 1, py: 1 }}>Write code to modify the canvas!</Typography>
        <Box sx={{ flexGrow: 1 }}>
            <Editor
                theme="vs-dark" options={{
                    minimap: { enabled: false },
                    "semanticHighlighting.enabled": true
                }}
                defaultLanguage="javascript"
                defaultValue={code}
                onChange={v => setCode(v ?? "")} />
        </Box>
        <Alert severity={codeError ? "error" : "success"} sx={{ wordBreak: "break-word" }}>
            {codeError
                ? `${codeError.name}: ${codeError.message}`
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
                    ? <ReflexContainer style={{ height: "100%" }} orientation="horizontal">
                        <ReflexElement flex={3} minSize={250}>{editorCard}</ReflexElement>
                        <ReflexSplitter/>
                        <ReflexElement flex={1}>
                            <Card sx={{ height: "100%" }}>
                                <List>
                                    {[...participants].map(p => <ListItemButton key={p}>
                                        {p}
                                    </ListItemButton>)}
                                </List>
                            </Card>
                        </ReflexElement>
                    </ReflexContainer>
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
                    <SharedCanvas width={400} height={400} ref={onCanvasRefChange} />
                    <video width={400} height={400} style={{ display: "none" }} autoPlay={true} ref={incomingVideoRef} />
                </Box>
            </ReflexElement>
        </ReflexContainer>
    </Box>;
}