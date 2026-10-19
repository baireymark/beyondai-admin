import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import storybook from 'eslint-plugin-storybook';
import { defineConfig, globalIgnores } from 'eslint/config';

/**
 * Module boundaries (see docs/architecture.md):
 *   app -> features -> shared
 * Shared code never imports features or routes, and features import each
 * other only through their public entry points: index.ts (client-safe) and
 * server.ts (server-only).
 */
const featureInternals = {
  group: ['@/features/*/*', '!@/features/*/server'],
  message:
    'Import a feature through its public entry points: @/features/<name> or @/features/<name>/server.',
};

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  ...storybook.configs['flat/recommended'],
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'import/no-cycle': 'error',
    },
  },
  {
    files: ['app/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: [featureInternals] }] },
  },
  {
    files: ['features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            featureInternals,
            { group: ['@/app/*'], message: 'Features must not import from app/.' },
          ],
        },
      ],
    },
  },
  {
    files: ['shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '@/app/*'],
              message: 'Shared code must not depend on features or routes.',
            },
          ],
        },
      ],
    },
  },
  {
    // Command-line scripts report progress on the terminal.
    files: ['prisma/**/*.ts', 'scripts/**/*.mjs'],
    rules: { 'no-console': 'off' },
  },
  {
    // Playwright fixtures call a parameter named "use", which is not React's use().
    files: ['tests/e2e/**/*.ts'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
  globalIgnores([
    'generated/**',
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'storybook-static/**',
    'playwright-report/**',
    'test-results/**',
    '.lighthouseci/**',
    'next-env.d.ts',
  ]),
]);
