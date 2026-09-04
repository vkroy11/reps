import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = [
  join(__dirname, '..', 'src'),
  join(__dirname, '..', '..', '..', 'packages', 'ui', 'src'),
];

/** Reanimated calls that put something on screen in motion. */
const ANIMATORS = [
  'withTiming',
  'withSpring',
  'withRepeat',
  'withDelay',
  'withSequence',
  'withDecay',
];

/**
 * Files that legitimately animate without asking, because what they animate
 * is not motion a vestibular-sensitive user can be harmed by - or because the
 * guard lives in a component they delegate to.
 */
const EXEMPT = new Set<string>([
  // Pure data: keyframes, durations and easings, no animation driven here.
  'motion.ts',
  'motion-curves.ts',
]);

function walk(dir: string): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...walk(full));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) found.push(full);
  }

  return found;
}

const animatedFiles = ROOTS.flatMap(walk)
  .map((path) => ({ path, source: readFileSync(path, 'utf8') }))
  .filter(({ path, source }) => {
    const name = path.split('/').pop() ?? '';
    if (EXEMPT.has(name)) return false;

    return ANIMATORS.some((fn) => source.includes(`${fn}(`));
  });

/**
 * Reduce Motion is an accessibility requirement, so it is checked rather than
 * remembered.
 *
 * This is a source audit, not a behavioural test: it cannot prove an animation
 * *stops*, only that every file which starts one has consulted the setting.
 * That is the failure mode worth catching - a new animation added months from
 * now that simply forgets, which no screenshot or render test would notice.
 */
describe('Reduce Motion', () => {
  it('finds the animated files at all, so a passing run means something', () => {
    expect(animatedFiles.length).toBeGreaterThan(8);
  });

  it.each(animatedFiles.map(({ path }) => [path.split('/src/')[1] ?? path, path]))(
    '%s consults useReduceMotion',
    (_label, path) => {
      const source = readFileSync(path as string, 'utf8');

      expect(source).toContain('useReduceMotion');
    },
  );

  it.each(animatedFiles.map(({ path }) => [path.split('/src/')[1] ?? path, path]))(
    '%s branches on it rather than only importing it',
    (_label, path) => {
      const source = readFileSync(path as string, 'utf8');

      // Either a guard clause or a ternary that picks the instant variant.
      expect(source).toMatch(/reduceMotion\s*(\?|\)|&&|\|\||===|!==)|!reduceMotion|if \(reduceMotion/);
    },
  );
});
