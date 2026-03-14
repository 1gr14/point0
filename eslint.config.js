import prettier from 'eslint-config-prettier'
import { defineConfig } from 'eslint/config'
import noOnlyTests from 'eslint-plugin-no-only-tests'
import tseslint from 'typescript-eslint'

export default defineConfig([
  // Global ignores to keep linting fast and avoid vendor/build dirs
  {
    ignores: [
      '**/node_modules/**',
      '**/engine/tests/template/**',
      '**/dist/**',
      '**/temp/**',
      '**/dist-test/**',
      '**/dist-npm/**',
      '**/packages-dist-npm/**',
      '**/.cache/**',
      '**/.husky/**',
      '**/.git/**',
      '**/templates/**',
      '**/point0.config.js',
      '**/points.lazy.ts',
      '**/points.ready.ts',
      '**/points.ts',
      '**/wouter-routes.tsx',
      'eslint.config.js',
      '.commitlintrc.js',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { disallowTypeAnnotations: false }],
      curly: ['error', 'all'],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],
      'no-console': [
        'error',
        {
          allow: ['error', 'info', 'warn'],
        },
      ],
      '@typescript-eslint/restrict-template-expressions': ['error'],
      '@typescript-eslint/switch-exhaustiveness-check': ['error'],
      // overrides for enabled recommended rules
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // slow rules
      '@typescript-eslint/no-unnecessary-condition': ['error'],
      '@typescript-eslint/no-floating-promises': ['error'],
    },
  },
  {
    files: ['**/*.test.{js,jsx,ts,tsx}'],
    plugins: {
      'no-only-tests': noOnlyTests,
    },
    rules: {
      'no-only-tests/no-only-tests': 'error',
    },
  },
  prettier,
])
