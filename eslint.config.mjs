import js from '@eslint/js';
import expoConfig from 'eslint-config-expo/flat.js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

const MOBILE_FILES = ['apps/mobile/**/*.{ts,tsx,js,jsx}'];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.expo/**',
      '**/expo-env.d.ts',
      'apps/mobile/.expo/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  // Expo's React Native rules apply to the app only, not the API or packages.
  ...expoConfig.map((config) => ({ ...config, files: MOBILE_FILES })),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Metro and other tooling configs are loaded by Node as CommonJS.
    files: ['**/*.config.js', '**/jest.setup.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  prettier,
);
