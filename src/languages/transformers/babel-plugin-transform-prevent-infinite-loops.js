/* eslint-disable */
/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * Copyright (c) 2017, Amjad Masad
 * 
 * React: https://github.com/facebook/react/blob/main/scripts/babel/transform-prevent-infinite-loops.js
 * CodeSandbox: https://github.com/codesandbox/codesandbox-client/blob/master/packages/app/src/sandbox/eval/transpilers/babel/worker/plugins/babel-plugin-transform-prevent-infinite-loops.ts
 * Some additional changes were made for this project.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Based on https://repl.it/site/blog/infinite-loops.

const MAX_ITERATIONS = 10001;

module.exports = ({ types: t, template }) => {
  // We set a global so that we can later fail the test
  // even if the error ends up being caught by the code.
  const buildGuard = template(`
  if (ITERATOR++ > MAX_ITERATIONS) {
    const e = new RangeError(\`Potential infinite loop: exceeded \${MAX_ITERATIONS} iterations.\`);
    throw e;
  }
  `);

  return {
    visitor: {
      'WhileStatement|ForStatement|DoWhileStatement': (path, file) => {
        // An iterator that is incremented with each iteration
        const iterator = path.scope.parent.generateUidIdentifier('loopIt');
        const iteratorInit = t.numericLiteral(0);
        path.scope.parent.push({
          id: iterator,
          init: iteratorInit,
        });
        // If statement and throw error if it matches our criteria
        const guard = buildGuard({
          ITERATOR: iterator,
          MAX_ITERATIONS: t.numericLiteral(MAX_ITERATIONS),
        });
        // No block statment e.g. `while (1) 1;`
        if (!path.get('body').isBlockStatement()) {
          const statement = path.get('body').node;
          path.get('body').replaceWith(t.blockStatement([guard, statement]));
        } else {
          path.get('body').unshiftContainer('body', guard);
        }
      },
    },
  };
};
