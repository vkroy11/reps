import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@reps/core': path.resolve(import.meta.dirname, '../../packages/core/src'),
    },
  },
});
