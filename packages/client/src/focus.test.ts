import type { LearningPathSummary } from '@reps/core';
import { describe, expect, it } from 'vitest';
import { createFocusStore, pathProgress, resolveFocusedPathId } from './focus';
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
