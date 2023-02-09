import { FeatureImplRecord } from '@necode-org/plugin-dev';
import dedent from 'dedent-js';
import brythonRaw from 'raw-loader!brython/brython.min.js';
import brythonStdlibRaw from 'raw-loader!brython/brython_stdlib.js';

declare global {
    var __BRYTHON__: {
        python_to_js(pythonCode: string, name?: string): string;
        py2js(source: { src: string, filename: string }, module: string, localsId: string): { to_js(): string };
        show_stack(stack: any): string | undefined;
        dict_to_list<T extends {}>(dict: unknown): Iterable<[key: keyof T, value: T[keyof T]]>;
    };
}

const setupBuiltinsCode = `
;(() => $B.builtins = new Proxy(
$B.builtins,
{
    get: (...args) =>
        Reflect.get(globalThis,args[1],globalThis)
        ?? Reflect.get(...args),
    has: (...args) =>
        Reflect.has(globalThis,args[1])
        ?? Reflect.has(...args),
    set: (...args) =>
        Reflect.set(globalThis,args[1],args[2],globalThis)
        ?? Reflect.set(...args),
    getOwnPropertyDescriptor: (...args) => {
        const original = Reflect.getOwnPropertyDescriptor(globalThis,args[1])
            ?? Reflect.getOwnPropertyDescriptor(...args);
        return original ? { ...original, configurable: true } : original;
    },
}))();$B.imported['']={};`;

function compileStatic(code: string) {
    try {
        const compiledJs = __BRYTHON__.py2js(
            { src: code, filename: '' },
            '',
            '',
        ).to_js();
        return setupBuiltinsCode + compiledJs + `;Object.assign(globalThis, $B.imported['']);`;
    }
    catch (e: any) {
        const err = new SyntaxError(e.msg) as any;
        err.lineNumber = e.lineno;
        err.columnNumber = e.offset;
        err.stack = __BRYTHON__.show_stack(e.$stack);
        throw err;
    }
}

export default {

    "requires/setup": {
        async setup() {
            if (typeof window !== 'undefined' && !document.getElementById('__brython_runtime_script')) {
                async function addScript(text: string, id: string) {
                    if (!document.getElementById(id)) {
                        const script = document.createElement('script');
                        script.type = 'text/javascript';
                        // We use src so that the `load` event fires.
                        script.src = `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`;
                        script.id = id;
                        return new Promise((resolve) => {
                            script.addEventListener('load', resolve);
                            document.head.appendChild(script);
                        });
                    }
                }
                await Promise.allSettled([
                    addScript(brythonRaw, '__brython_runtime_script'),
                    addScript(brythonStdlibRaw, '__brython_stdlib_script'),
                ]);
            }
        },
    },

    "evaluate/any": {
        evaluate(code) {
            const rawJSified = __BRYTHON__.python_to_js(dedent`
            def entry():
                try:
                    return { 'type': 'ok', 'result': eval(${JSON.stringify(code)}) }
                except Exception as exc:
                    return { 'type': 'error', 'error': exc }
            entry
            `, '__main__');
            const resultIndex = rawJSified.lastIndexOf('$locals___main__["entry"];');
            const jsified = `let runner;${rawJSified.slice(0, resultIndex)}runner = ${rawJSified.slice(resultIndex)};return runner;`;

            const resultRaw = Function(jsified)()();
            const result = Object.fromEntries(
                __BRYTHON__.dict_to_list<{ type: 'ok' | 'error', result?: any, error?: any }>(resultRaw)
            );
            if (result.type === 'ok') {
                return result.result;
            }
            const err = new Error(result.error.args[0]);
            err.name = result.error.__class__.$infos.__name__;
            throw err;
        },
    },

    "entryPoint/any": {
        entryPoint(code, name) {
            const rawJSified = __BRYTHON__.python_to_js(dedent`
            def entry(*args):
                try:
                    globals = { '__name__': '__main__' }
                    exec(${JSON.stringify(code)}, globals)
                    val = globals['${name}'](*args)
                    return { 'type': 'ok', 'result': val }
                except Exception as exc:
                    return { 'type': 'error', 'error': exc }
            entry
            `, '__main__');
            const entryFnValueIndex = rawJSified.lastIndexOf('$locals___main__["entry"];');
            const js = `let runner;${rawJSified.slice(0, entryFnValueIndex)}runner = ${rawJSified.slice(entryFnValueIndex)};return runner;`;
            const entry = Function(js)();

            return ((...args: any[]) => {
                const resultRaw = entry(...args);
                const result = Object.fromEntries(
                    __BRYTHON__.dict_to_list<{ type: 'ok' | 'error', result?: any, error?: any }>(resultRaw)
                );
                if (result.type === 'ok') {
                    return result.result;
                }
                const err = new Error(result.error.args[0]);
                err.name = result.error.__class__.$infos.__name__;
                throw err;
            }) as any;
        },
    },

    "iframe/static": {
        getDownloadableAssetURIs() {
            return [];
        },
        async compile(code) {
            return brythonRaw + brythonStdlibRaw + ';' + compileStatic(code);
        },
    },

    "worker/static": {
        async compile(code) {
            return brythonRaw + brythonStdlibRaw + ';' + compileStatic(code);
        },
    },

    "repl/instanced/fullSync": {
        createInstance() {
            const rawJSified = __BRYTHON__.python_to_js(dedent`
            import traceback

            globals = {}
            locals = globals
            def run(code):
                try:
                    code = compile(currentLine, '<stdin>', 'eval')
                except SyntaxError:
                    msg = traceback.format_exc()
                    try:
                        code = compile(currentLine, '<stdin>', 'exec')
                        exec(code, globals, locals)
                        return []
                    except Exception:
                        return [msg]
                except Exception:
                    return [traceback.format_exc()]
                else:
                    return [val]
            run
            `, '__main__');
            const runFnValueIndex = rawJSified.lastIndexOf('$locals___main__["run"];');
            const js = `let runner;${rawJSified.slice(0, runFnValueIndex)}runner = ${rawJSified.slice(runFnValueIndex)};return runner;`;

            return { evaluate: Function(js)() };
        },
    }

} satisfies FeatureImplRecord<[
    'requires/setup',
    'entryPoint/any',
    'evaluate/any',
    'iframe/static',
    'worker/static',
    'repl/instanced/fullSync',
]>;