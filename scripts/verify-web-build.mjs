#!/usr/bin/env node
// Checks that a web export actually points at the API it was told to.
//
// Why this exists: EXPO_PUBLIC_* values are inlined by a Babel transform, and
// Metro's transform cache is not keyed on them. A build that once ran without
// EXPO_PUBLIC_API_URL keeps reusing the cached transform - with the branch
// that reads it dead-code eliminated - however many times the variable is set
// afterwards. The deploy then serves an app hard-wired to localhost while the
// host's dashboard shows the variable set correctly, which is close to
// undebuggable from the outside.
//
// `expo export --clear` avoids it. This verifies rather than assumes.
//
//   node scripts/verify-web-build.mjs [expectedApiUrl]
//
// With no argument it reads EXPO_PUBLIC_API_URL from the environment, so the
// same command works in CI as a post-build step.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BUNDLE_DIR = 'apps/mobile/dist/_expo/static/js/web';
const expected = (process.argv[2] ?? process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

if (!expected) {
  console.error('No expected URL. Pass one, or set EXPO_PUBLIC_API_URL.');
  process.exit(2);
}

let bundles;
try {
  bundles = readdirSync(BUNDLE_DIR).filter((name) => name.endsWith('.js'));
} catch {
  console.error(`No bundles at ${BUNDLE_DIR}. Run \`npm run build:web\` first.`);
  process.exit(2);
}

// The resolver compiles to one of two shapes: the configured URL inlined, or -
// when the variable was missing - the whole branch gone, leaving only the
// dev-server fallback.
const MARKER = 'resolveApiBaseUrl=function';
const found = [];

for (const name of bundles) {
  const source = readFileSync(join(BUNDLE_DIR, name), 'utf8');
  let at = source.indexOf(MARKER);

  while (at !== -1) {
    found.push({ name, body: source.slice(at, at + 300) });
    at = source.indexOf(MARKER, at + 1);
  }
}

if (found.length === 0) {
  console.error(`Could not find ${MARKER} in any bundle. Did the export succeed?`);
  process.exit(2);
}

const problems = found.filter(({ body }) => !body.includes(expected));

if (problems.length > 0) {
  console.error(`\nThe built bundle does not point at ${expected}.\n`);
  for (const { name, body } of problems) {
    console.error(`  ${name}`);
    console.error(`  ${body.slice(0, 180)}\n`);
  }
  console.error('Almost always a stale Metro transform cache. Rebuild with:');
  console.error('  EXPO_PUBLIC_API_URL=<url> npm run build:web\n');
  process.exit(1);
}

console.log(`Web build points at ${expected} (${found.length} bundle(s) checked).`);
