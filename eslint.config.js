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
      '@typescript-eslint/only-throw-error': [
        'error',
        {
          allow: [{ from: 'package', name: 'Error0', package: '@devp0nt/error0' }],
        },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { disallowTypeAnnotations: false }],
      curly: ['error', 'all'],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-unnecessary-condition': ['error'],
      '@typescript-eslint/restrict-template-expressions': ['error'],
      '@typescript-eslint/switch-exhaustiveness-check': ['error'],

      // disable
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/non-nullable-type-assertion-style': 'off',
      'max-depth': 'off',
      'no-control-regex': 'off',
      '@typescript-eslint/max-params': 'off',
      '@typescript-eslint/prefer-return-this-type': 'off',
      '@typescript-eslint/no-duplicate-type-constituents': 'off',
      '@typescript-eslint/no-unnecessary-type-arguments': 'off',
      'no-console': 'off',
      'max-lines': 'off',
      'no-lonely-if': 'off',
      'no-negated-condition': 'off',
      'no-param-reassign': 'off',
      'arrow-body-style': 'off',
      complexity: 'off',
      'no-plusplus': 'off',
      'max-nested-callbacks': 'off',
      '@typescript-eslint/unified-signatures': 'off',
      '@typescript-eslint/class-methods-use-this': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/prefer-destructuring': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/init-declarations': 'off',
      '@typescript-eslint/consistent-indexed-object-style': 'off',
      '@typescript-eslint/consistent-type-assertions': 'off',

      // TODO: try to remove this disables
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-type-assertion': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
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
