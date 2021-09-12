import { Box, Card, CardContent } from "@mui/material";
import { Monaco } from "@monaco-editor/react";
import React, { useEffect, useRef, useState } from "react";
import { ReflexContainer, ReflexElement, ReflexSplitter } from "react-reflex";
import { useIsolatedEditor } from "../../components/IsolatedEditor";

declare const monaco: Monaco;

export function CreateTestActivity() {
    function configureMonaco() {
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            ...monaco?.languages.typescript.typescriptDefaults.getCompilerOptions(),
            strict: true
        });
    }

    const [val, setVal] = useState("");
    const setValuesRef = useRef({} as { [path: string]: (value: string) => void });

    useEffect(() => {
        if (val?.includes("reset")) {
            setVal('r');
        }
    }, [val]);
    
    function ConfiguredEditor(path: string) {
        const { Editor, setValue } = useIsolatedEditor();
        setValuesRef.current[path] = setValue;

        return <Editor
            configureMonaco={configureMonaco}
            path={path}
            keepCurrentModel={true}
            theme="vs-dark" options={{
                minimap: { enabled: false },
                "semanticHighlighting.enabled": true
            }}
            defaultLanguage="typescript"
            onChange={v => (setVal(v ?? ""), Object.entries(setValuesRef.current).forEach(([p, s]) => p === path ? null : s(v!)))}
        />;
    }

    return <>
        <ReflexContainer orientation="vertical">
            <ReflexElement>
                <ReflexContainer orientation="horizontal">
                    <ReflexElement>
                        <Card sx={{ height: "100%" }}>
                            <CardContent sx={{ height: "100%" }}>
                                <Box sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}>
                                    <Box>
                                        a.ts
                                    </Box>
                                    <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                                        {ConfiguredEditor("a.ts")}
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </ReflexElement>
                    <ReflexSplitter/>
                    <ReflexElement>
                        <Card sx={{ height: "100%" }}>
                            <CardContent sx={{ height: "100%" }}>
                                <Box sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}>
                                    <Box>
                                        b.ts
                                    </Box>
                                    <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                                        {ConfiguredEditor("b.ts")}
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </ReflexElement>
                </ReflexContainer>
            </ReflexElement>
            <ReflexSplitter/>
            <ReflexElement>
                <ReflexContainer orientation="horizontal">
                    <ReflexElement>
                        <Card>Top Right<br/>{val}</Card>
                    </ReflexElement>
                    <ReflexSplitter/>
                    <ReflexElement>
                        <Card>Bottom Right<br/>{val}</Card>
                    </ReflexElement>
                </ReflexContainer>    
            </ReflexElement>            
        </ReflexContainer>
    </>;
}