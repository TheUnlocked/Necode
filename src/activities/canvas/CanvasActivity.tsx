import { Card, Typography } from "@mui/material";
import { Box, styled } from "@mui/system";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReflexContainer, ReflexElement, ReflexSplitter } from "react-reflex";
import { useIsolatedEditor } from "../../components/IsolatedEditor";
import { Javascript } from "../../languages/javascript";
import { BrowserRunner } from "../../runner/BrowserRunner";

const SharedCanvas = styled('canvas')({
    maxWidth: "100%",
    maxHeight: "100%",
    backgroundColor: "white"
});

export function CanvasActivity() {
    const { Editor } = useIsolatedEditor();
    const code = useRef("/**\n * @param {Omit<CanvasRenderingContext2D, 'canvas'>} ctx\n */\nfunction draw(ctx) {\n    \n}");

    const runner = useMemo(() => {
        const runner = new BrowserRunner();
        runner.start();
        return runner;
    }, []);
    
    useEffect(() => () => runner.shutdown(), [runner]);

    const [context2d, setContext2d] = useState<CanvasRenderingContext2D | null>(null);

    const onCanvasRefChange = useCallback((canvas: HTMLCanvasElement) => {
        if (canvas) {
            setContext2d(canvas.getContext("2d"));
        }
    }, []);

    useEffect(() => {
        if (context2d) {
            const interval = setInterval(() => {
                runner.runWithArguments(
                    new Javascript().toRunnerCode(code.current, { entryPoint: "draw" }),
                    [context2d]
                );
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [context2d, runner]);

    return <Box sx={{
            px: 2,
            pb: 2,
            height: "100%",
            "& .reflex-container > .reflex-element": {
                overflow: "hidden"
            }
        }}>
        <ReflexContainer orientation="vertical">
            <ReflexElement minSize={275}>
                <Card sx={{ height: "100%" }}>
                    <Typography variant="body1" component="div" sx={{ pl: 2, pr: 1, py: 1 }}>Write code to modify the canvas!</Typography>
                    <Box sx={{ height: "calc(100% - 40px)" }}>
                        <Editor
                            theme="vs-dark" options={{
                                minimap: { enabled: false },
                                "semanticHighlighting.enabled": true
                            }}
                            defaultLanguage="javascript"
                            defaultValue={code.current}
                            onChange={v => code.current = v ?? ""} />
                    </Box>
                </Card>
            </ReflexElement>
            <ReflexSplitter/>
            <ReflexElement>
                <Box sx={{
                    height: "100%",
                    width: "100%",
                    pl: 1,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center"
                }}>
                    <SharedCanvas width={400} height={400} ref={onCanvasRefChange} />
                </Box>
            </ReflexElement>
        </ReflexContainer>
    </Box>;
}