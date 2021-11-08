import type * as BabelCoreNamespace from '@babel/core';
import type { PluginPass, NodePath, PluginObj } from '@babel/core';
import type { CallExpression, Identifier, Node } from '@babel/types';
import SyntaxTransformError from './SyntaxTransformError';

type Babel = typeof BabelCoreNamespace;

const checkFunctionNames = [
    'check',
    'checkError'
];

const autoAwaitFunctionNames = [
    ...checkFunctionNames,
    'wait',
    'waitFor'
];

const reservedSymbols = [
    'SHOW_TEST'
];

function visitIdentifier(babel: Babel, path: NodePath<Identifier>, _: PluginPass) {
    const { types: t } = babel;

    if (reservedSymbols.includes(path.node.name)) {
        if (t.isCallExpression(path.parent)) {
            const fnNode = path.parent.callee;
            if (t.isIdentifier(fnNode) && checkFunctionNames.includes(fnNode.name)) {
                return;
            }
        }
        throw new SyntaxTransformError(`\`SHOW_TEST\` will not work unless directly used inside a check statement (line ${path.node.loc?.start.line})`);
    }
}

function visitCallExpression(babel: Babel, path: NodePath<CallExpression>, pass: PluginPass) {
    const { types: t, traverse } = babel;

    const fnNode = path.node.callee;

    if (t.isIdentifier(fnNode)) {
        if (checkFunctionNames.includes(fnNode.name)) {
            const args = path.node.arguments;

            let assertionNode = args[0];
            let messageNode = args[1];

            if (!t.isExpression(assertionNode)) {
                // Can't do any form of source code replacement unless
                // the assertion condition is a regular argument.
                return;
            }

            let showTest = false;
            if (t.isIdentifier(messageNode)) {
                if (messageNode.name === 'SHOW_TEST') {
                    showTest = true;
                }
            }

            function stringNodeFromSource(node: Node) {
                return t.stringLiteral('%SOURCE%' + pass.file.code.slice(
                    node.start!,
                    node.end!
                ));
            }

            if (t.isFunctionExpression(assertionNode) || t.isArrowFunctionExpression(assertionNode)) {
                if (showTest) {
                    const body = assertionNode.body;
                    if (t.isExpression(body)) {
                        messageNode = stringNodeFromSource(body);
                    }
                    else {
                        messageNode = stringNodeFromSource(assertionNode);
                    }
                }
            }
            else {
                if (showTest) {
                    messageNode = stringNodeFromSource(assertionNode);
                }
                assertionNode = t.arrowFunctionExpression([], assertionNode, true);
            }


            path.replaceWith(t.callExpression(fnNode, [
                assertionNode,
                ...messageNode ? [messageNode] : [],
                ...args.slice(2)
            ]));

            traverse(assertionNode, {
                Identifier: path => visitIdentifier(babel, path, pass),
                CallExpression: path => visitCallExpression(babel, path, pass)
            }, path.scope, path);

            path.skip();
        }
        if (autoAwaitFunctionNames.includes(fnNode.name)) {
            const parentFunction = path.getFunctionParent();

            if (parentFunction && !parentFunction.node.async) {
                throw new SyntaxTransformError(`\`${fnNode.name}\` cannot be used in a synchronous context. Add the \`async\` keyword to the surrounding function.`);
            }

            path.replaceWith(t.awaitExpression(path.node));
            path.skip();
        }
    }
}

export default function transformTestScaffolding(babel: Babel): PluginObj {
    return {
        visitor: {
            Identifier: (path, pass) => visitIdentifier(babel, path, pass),
            CallExpression: (path, pass) => visitCallExpression(babel, path, pass),
        }
    };
}