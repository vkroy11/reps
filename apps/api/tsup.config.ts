import { defineConfig } from 'tsup';

// Workspace packages ship raw TypeScript, so they are bundled in rather than
// resolved at runtime. Deployment is then a single `node dist/index.js`.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  noExternal: [/^@reps\//],
});
