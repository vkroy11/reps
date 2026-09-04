import type { LearningPathSummary } from '@reps/core';
import { createJsonStore, storageKey, type Storage } from './storage';
import { z } from 'zod';

/**
 * Which path the home screen shows when someone is learning more than one
 * thing.
 *
 * The API already returns paths most-recently-practised first, so index 0 is
 * the default focus and no server field is needed. A locally stored id only
 * overrides that when the learner has explicitly switched, and it is ignored
 * once that path no longer exists - otherwise deleting a path would leave the
 * home screen pointing at nothing.
 */
/** Every technique done. A finished path is still readable, just not current. */
export function isPathComplete(
  path: Pick<LearningPathSummary, 'techniqueCount' | 'completedCount'>,
): boolean {
  return path.techniqueCount > 0 && path.completedCount >= path.techniqueCount;
}

/**
 * The order the learner sees their hobbies in: unfinished first.
 *
 * A finished path has nothing to do on it, so leaving it in the swipe order
 * puts a dead page between two live ones - and if it happens to be the most
 * recently practised, it becomes the page the app opens on. It stays available
 * because the work in it is worth looking back at, but it sorts behind
 * everything actionable, including the page for starting something new.
 *
 * A stable partition, so the API's most-recently-practised-first order is
 * preserved inside each group.
 */
export function orderPaths(paths: readonly LearningPathSummary[]): LearningPathSummary[] {
  return [
    ...paths.filter((path) => !isPathComplete(path)),
    ...paths.filter((path) => isPathComplete(path)),
  ];
}

export function resolveFocusedPathId(
  paths: readonly LearningPathSummary[],
  storedId: string | null,
): string | null {
  if (paths.length === 0) return null;

  const stored = storedId && paths.some((path) => path.id === storedId) ? storedId : null;

  return stored ?? paths[0]?.id ?? null;
}

export function createFocusStore(storage: Storage) {
  const json = createJsonStore(storage);

  return {
    async load(): Promise<string | null> {
      return json.read(storageKey.focusedPathId, (value) => {
        const parsed = z.string().min(1).safeParse(value);

        return parsed.success ? parsed.data : null;
      });
    },

    async save(pathId: string): Promise<void> {
      await json.write(storageKey.focusedPathId, pathId);
    },

    async clear(): Promise<void> {
      await json.clear(storageKey.focusedPathId);
    },
  };
}

export type FocusStore = ReturnType<typeof createFocusStore>;

/** Progress for the home-screen bar, guarded against a path with no techniques. */
export function pathProgress(
  path: Pick<LearningPathSummary, 'techniqueCount' | 'completedCount'>,
): number {
  if (path.techniqueCount === 0) return 0;

  return Math.min(path.completedCount / path.techniqueCount, 1);
}
