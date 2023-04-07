import { transformAsync, transformSync } from '@babel/core';
import { FeatureImplRecord } from '@necode-org/plugin-dev';
import babelPluginTransformPreventInfiniteLoops from './transformers/babel-plugin-transform-prevent-infinite-loops';
import BabelPlugin from './transformers/BabelPlugin';

export default function createJavascriptLikeFeatures(basePlugins: BabelPlugin[]) {
    function compile(code: string): string;
    function compile(code: string, errValue: string, plugins?: BabelPlugin[], sync?: true): string;
    function compile(code: string, errValue: string, plugins?: BabelPlugin[], sync?: false): Promise<string>;
    function compile<T>(code: string, errValue: T, plugins?: BabelPlugin[], sync?: true): T | string;
    function compile<T>(code: string, errValue: T, plugins?: BabelPlugin[], sync?: false): Promise<T | string>;
    function compile<T>(code: string, errValue: T | string = code, plugins?: BabelPlugin[], sync = true) {
        plugins = [...basePlugins, ...plugins ?? [], babelPluginTransformPreventInfiniteLoops];
        if (sync) {
            return transformSync(code, { plugins })?.code ?? errValue;
        }
        return transformAsync(code, { plugins }).then(x => x?.code ?? errValue);
    }

    return {
        "js/babel": {
            compileToJs(code, plugins) {
                return compile(code, undefined, plugins, false);
            },
        },

        "evaluate/any/sync": {
            evaluate(code) {
                return eval(`"use strict";(${compile(code)})`);
            },
        },

        "evaluate/any": {
            async evaluate(code) {
                return eval(`"use strict";(${await compile(code, code, [], false)})`);
            },
        },
    
        "entryPoint/any/sync": {
            entryPoint(code, name) {
                return eval(`"use strict";(()=>{${compile(code)};return ${name}})()`);
            },
        },
    
        "iframe/static": {
            getDownloadableAssetURIs() {
                return [];
            },
            compile(code) {
                return compile(code, code, [], false);
            },
        },
    
        "worker/static": {
            compile(code) {
                return compile(code, code, [], false);
            },
        },
    
        "repl/instanced/fullSync": {
            createInstance() {
                // This is sort of quine-like
                // The reason that this mess exists is because eval() creates a new lexical scope,
                // so let and const declarations won't be captured outside of it. To mitigate that,
                // we eval a new function which is inside the eval scope.
                function ___evalStep(code: string) {
                    return eval(`
                    try {
                        const ___evalStep=${___evalStep.toString()};
                        ${code};
                        ___evalStep.output=___output;
                        ___output=[];
                        ___evalStep
                    }
                    catch (e) {
                        console.error(e);
                        delete ___evalStep.result;
                        ___evalStep.output=___output;
                        ___output=[];
                        ___evalStep
                    }
                    `);
                }
                let currentStep: typeof ___evalStep & { result?: any, output: string[] } = eval(`
                    "use strict";
                    let ___output = [];
                    const console = (() => {
                        function safeStringify(x) {
                            try {
                                return JSON.stringify(
                                    x,
                                    (_, v) => __safeStringify(v),
                                    Object.keys(x).length > 2 ? 4 : null
                                ) ?? \`\${x}\`;
                            }
                            catch {
                                return \`\${x}\`;
                            }
                        }
                        const log = (...args) => ___output.push(args.map(safeStringify).join(' '));
                        return {
                            ...window.console,
                            debug: log,
                            log: log,
                            warn: log,
                            error: log,
                        }
                    })();
                    ${___evalStep.toString()}
                    ___evalStep
                `);
                return {
                    evaluate(code) {
                        currentStep = currentStep(compile(code, code, [
                            ({ types: t }) => ({ visitor: {
                                Program: path => {
                                    const body = path.get('body');
                                    for (let i = body.length - 1; i >= 0; i--) {
                                        const statement = body[i];
                                        if (statement.isExpressionStatement()) {
                                            const expr = statement.get('expression');
                                            expr.replaceWith(
                                                t.assignmentExpression(
                                                    '=',
                                                    t.memberExpression(
                                                        t.identifier('___evalStep'),
                                                        t.identifier('result'),
                                                    ),
                                                    expr.node,
                                                )
                                            );
                                        }
                                    }
                                }
                            } })
                        ]));
                        return [
                            ...currentStep.output.map(x => ({ type: 'text' as const, contents: x })),
                            ...'result' in currentStep ? [{ type: 'result' as const, contents: `${currentStep.result}` }] : []
                        ];
                    }
                };
            },
        },
    
    } satisfies FeatureImplRecord<[
        'entryPoint/any/sync',
        'evaluate/any/sync',
        'evaluate/any',
        'iframe/static',
        'worker/static',
        'repl/instanced/fullSync',
        'js/babel',
    ]>;
}