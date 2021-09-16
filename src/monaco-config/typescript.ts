import { Monaco } from "@monaco-editor/react";

declare const monaco: Monaco;

export default function typescriptMonacoConfig() {
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        ...monaco?.languages.typescript.typescriptDefaults.getCompilerOptions(),
        strict: true
    });
};