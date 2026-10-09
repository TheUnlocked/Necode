// @ts-check

import { fixupPluginRules } from '@eslint/compat';
import ruleOfHooks from '@grncdr/eslint-plugin-react-hooks';
import stylistic from '@stylistic/eslint-plugin';
import next from 'eslint-config-next';
import turboConfig from 'eslint-config-turbo/flat';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  ...turboConfig,
  ...next,
  globalIgnores([
    '**/.next',
    '**/dist',
    '**/node_modules',
    '~tsconfig/**/*.json'
  ]),
  {
    plugins: {
      '@stylistic': stylistic,
      '@grncdr/react-hooks': fixupPluginRules(/** @type {any} */ (ruleOfHooks)),
      '@typescript-eslint': tseslint.plugin,
    },
    settings: {
      next: {
        rootDir: 'apps/necode'
      }
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          args: 'none',
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrors: 'none'
        },
      ],
      '@stylistic/semi': ['warn', 'always', { omitLastInOneLineBlock: true }],
      '@stylistic/brace-style': ['warn', 'stroustrup', { allowSingleLine: true }],
      // Waiting on https://github.com/typescript-eslint/typescript-eslint/issues/3105 for TS support
      'array-bracket-spacing': ['warn', 'never'],
      '@stylistic/object-curly-spacing': ['warn', 'always'],
      // Indentation rules are very hard to get right, so it is currently not included

      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
      '@grncdr/react-hooks/rules-of-hooks': 'error',
      '@grncdr/react-hooks/exhaustive-deps': [
        'warn',
        {
          'additionalHooks': '(useAsyncMemo|useDrop|useDrag|useDragLayer)',
          'staticHooks': {
            'useDirty': [false, true, true, false, true],
            'useLocalCachedState': [false, true, false, false]
          }
        }
      ]
    }
  }
]);