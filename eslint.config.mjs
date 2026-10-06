import js from '@eslint/js';
import ts from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import a11y from 'eslint-plugin-jsx-a11y';
export default ts.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'test-results/**',
      'playwright-report/**',
      'next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.tsx'],
    plugins: { 'react-hooks': hooks, 'jsx-a11y': a11y },
    rules: { ...hooks.configs.recommended.rules, ...a11y.configs.recommended.rules },
  },
  { files: ['**/*.mjs'], languageOptions: { globals: { process: 'readonly' } } },
  {
    files: ['scripts/*.mjs'],
    languageOptions: {
      globals: { fetch: 'readonly', AbortSignal: 'readonly', console: 'readonly' },
    },
  },
);
