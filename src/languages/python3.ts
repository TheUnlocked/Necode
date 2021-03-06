import RunnableLanguage from './RunnableLanguage';
import dedent from 'dedent-js';
// import transformPreventInfiniteLoops from "./transformers/babel-plugin-transform-prevent-infinite-loops";
// import { transformSync } from '@babel/core';

import brythonRaw from 'raw-loader!brython/brython.js';
import brythonStdlibRaw from 'raw-loader!brython/brython_stdlib.js'; 
import { FeatureOptionsOf, languageDescription } from './LangaugeDescription';
import PythonIcon from '../util/icons/PythonIcon';
import supportsGlobal from "./features/supportsGlobal";
import supportsEntryPoint from "./features/supportsEntryPoint";
import supportsIsolated from './features/supportsIsolated';

export const pythonDescription = languageDescription({
    name: 'python3',
    monacoName: 'python',
    displayName: 'Python 3',
    icon: PythonIcon,
    features: [
        supportsEntryPoint,
        supportsGlobal,
        supportsIsolated
    ] as const
});

if (typeof window !== 'undefined') {
    function addScript(text: string, id: string) {
        if (!document.getElementById(id)) {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.innerHTML = text;
            script.id = id;
            document.head.appendChild(script);
        }
    }
    addScript(brythonRaw, '__brython_runtime_script');
    addScript(brythonStdlibRaw, '__brython_stdlib_script');
}

declare global {
    var __BRYTHON__: {
        python_to_js(pythonCode: string, name?: string): string;
        py2js(source: string, module: string, localsId: string): { to_js(): string };
        show_stack(stack: any): string | undefined;
    };
}

export class Python3 implements RunnableLanguage<typeof pythonDescription> {
    toRunnerCode(code: string, options: FeatureOptionsOf<typeof pythonDescription>) {
        let result: string;

        if (options.global) {
            try {
                result = 'const $locals_ = globalThis;' + __BRYTHON__.py2js(code, '', '').to_js();
            }
            catch (e: any) {
                const err = new SyntaxError(e.msg) as any;
                err.lineNumber = e.lineno;
                err.columnNumber = e.offset;
                err.stack = __BRYTHON__.show_stack(e.$stack);
                throw err;
            }
        }
        else if (typeof options.entryPoint === 'string') {
            const rawJSified = __BRYTHON__.python_to_js(dedent`
            def entry(*args):
                result = None
                try:
                    globals = { '__name__': '__main__'}
                    exec(${JSON.stringify(code)}, globals)
                    val = globals['${options.entryPoint}'](*args)
                    result = { 'type': 'ok', 'result': val }
                except Exception as exc:
                    result = { 'type': 'error', 'error': exc }
                return result
            entry
            `, '__main__');
            const resultIndex = rawJSified.lastIndexOf('$locals___main__["entry"];');
            const jsified = `let runner;${rawJSified.slice(0, resultIndex)}runner = ${rawJSified.slice(resultIndex)};return runner;`;
    
            const js = `const entry = (() => {
                const resultRaw = Function(${JSON.stringify(jsified)})()(...arguments);
                const result = Object.fromEntries(__BRYTHON__.dict_to_list(resultRaw));
                if (result.type === 'ok') {
                    return result.result;
                }
                const err = new Error(result.error.args[0]);
                err.name = result.error.__class__.$infos.__name__;
                throw err;
            })`;
            // console.log(js)
            // const result = transformSync(js, {
            //     plugins: [transformPreventInfiniteLoops]
            // });
            result = js;
        }
        else {
            throw new Error('Python 3 code must be generated in either global or entryPoint mode');
        }

        if (options.isolated) {
            return brythonRaw + brythonStdlibRaw + result;
        }
        return result;
    }
}