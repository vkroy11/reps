import type { LearningPathSummary } from '@reps/core';
import { describe, expect, it } from 'vitest';
import {
  createFocusStore,
  isPathComplete,
  orderPaths,
  pathProgress,
  resolveFocusedPathId,
} from './focus';
import { createMemoryStorage, storageKey } from './storage';

function summary(id: string, overrides: Partial<LearningPathSummary> = {}): LearningPathSummary {
  return {
    id,
    userId: 'usr_1',
    skill: id,
    archetype: 'motor',
    goal: `get good at ${id}`,
    level: 'starting out',
    dailyMinutes: 20,
    daysPerWeek: 5,
    preferredFormats: ['video'],
    language: 'en',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    xp: 0,
    badges: [],
    techniqueCount: 6,
    completedCount: 0,
    ...overrides,
  };
}

describe('resolveFocusedPathId', () => {
  const paths = [summary('guitar'), summary('chess')];

  it('focuses the most recently practised path by default', () => {
    // The API already sorts by updatedAt desc, so index 0 is the answer.
    expect(resolveFocusedPathId(paths, null)).toBe('guitar');
  });

  it('honours an explicit switch', () => {
    expect(resolveFocusedPathId(paths, 'chess')).toBe('chess');
  });

  /** Otherwise deleting a path would leave the home screen pointing at nothing. */
  it('ignores a stored id that no longer exists', () => {
    expect(resolveFocusedPathId(paths, 'pottery')).toBe('guitar');
  });

  it('returns null when there is nothing to focus', () => {
    expect(resolveFocusedPathId([], 'guitar')).toBeNull();
    expect(resolveFocusedPathId([], null)).toBeNull();
  });
});

describe('focus store', () => {
  it('round-trips and clears the choice', async () => {
    const store = createFocusStore(createMemoryStorage());

    expect(await store.load()).toBeNull();
    await store.save('chess');
    expect(await store.load()).toBe('chess');
    await store.clear();
    expect(await store.load()).toBeNull();
  });

  it('treats corrupt stored data as no choice', async () => {
    const storage = createMemoryStorage();
    await storage.setItem(storageKey.focusedPathId, '{oops');

    expect(await createFocusStore(storage).load()).toBeNull();
  });
});

describe('pathProgress', () => {
  it('reports the completed fraction', () => {
    expect(pathProgress({ techniqueCount: 8, completedCount: 2 })).toBe(0.25);
  });

  it('does not divide by zero on an empty path', () => {
    expect(pathProgress({ techniqueCount: 0, completedCount: 0 })).toBe(0);
  });

  it('never exceeds one', () => {
    expect(pathProgress({ techniqueCount: 3, completedCount: 5 })).toBe(1);
  });
});

describe('ordering hobbies', () => {
  const live = summary('guitar', { completedCount: 2 });
  const alsoLive = summary('chess', { completedCount: 0 });
  const done = summary('drawing', { completedCount: 6 });

  it('recognises a finished path', () => {
    expect(isPathComplete(done)).toBe(true);
    expect(isPathComplete(live)).toBe(false);
    // Over-completion is still complete, and a path with no techniques is not.
    expect(isPathComplete(summary('x', { completedCount: 9 }))).toBe(true);
    expect(isPathComplete(summary('y', { techniqueCount: 0, completedCount: 0 }))).toBe(false);
  });

  /**
   * A finished path that happens to be the most recently practised would
   * otherwise become the page the app opens on, with nothing to do on it.
   */
  it('sorts finished paths behind live ones', () => {
    expect(orderPaths([done, live, alsoLive]).map((path) => path.id)).toEqual([
      'guitar',
      'chess',
      'drawing',
    ]);
  });

  it('keeps the server order inside each group', () => {
    expect(orderPaths([alsoLive, live]).map((path) => path.id)).toEqual(['chess', 'guitar']);
  });

  it('leaves a list with nothing finished alone', () => {
    expect(orderPaths([live, alsoLive]).map((path) => path.id)).toEqual(['guitar', 'chess']);
  });

  it('does not mutate what it was given', () => {
    const input = [done, live];
    orderPaths(input);

    expect(input.map((path) => path.id)).toEqual(['drawing', 'guitar']);
  });

  /** Ordering first is what makes the default focus a live path. */
  it('gives resolveFocusedPathId a live path to default to', () => {
    expect(resolveFocusedPathId(orderPaths([done, live]), null)).toBe('guitar');
  });
});
