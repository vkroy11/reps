import { PrismaClient } from '@prisma/client';
import type { LearningPath, Technique } from '@reps/core';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { env } from '../../config/env';
import type { Repositories } from '../types';
import { createPrismaRepositories } from './index';

/**
 * Runs against a real Postgres. Skipped when DATABASE_URL is unset so a clone
 * with no database still gets a green suite.
 */
const describeIfDatabase = env.DATABASE_URL ? describe : describe.skip;

const DEVICE_ID = 'device-prisma-integration-test';

function technique(overrides: Partial<Technique> & { id: string; pathId: string }): Technique {
  return {
    order: 0,
    title: 'Chord transitions',
    whyItMatters: 'Smooth changes are needed for every campfire song.',
    modality: 'watch_and_do',
    practicePrompt: 'G -> C -> G -> D, ten clean reps at 60bpm.',
    estimatedMinutes: 15,
    status: 'active',
    confidence: null,
    struggleCount: 0,
    bridgeForTechniqueId: null,
    searchQueries: ['guitar chord transitions beginner'],
    resources: [],
    ...overrides,
  };
}

describeIfDatabase('prisma repositories', () => {
  const prisma = new PrismaClient();
  let repositories: Repositories;
  let userId: string;

  beforeEach(async () => {
    repositories = createPrismaRepositories(prisma);
    // Cascades clear paths, techniques, resources and content.
    await prisma.user.deleteMany({ where: { deviceId: DEVICE_ID } });
    const user = await repositories.users.findOrCreateByDeviceId(DEVICE_ID);
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { deviceId: DEVICE_ID } });
    await prisma.resourceCacheEntry.deleteMany({ where: { key: { startsWith: 'test-' } } });
    await prisma.quotaUsage.deleteMany({ where: { resource: 'test-resource' } });
    await prisma.$disconnect();
  });

  function samplePath(id = 'path_test_1'): LearningPath {
    return {
      id,
      userId,
      skill: 'guitar',
      archetype: 'motor',
      goal: 'play 5 songs at a campfire',
      level: 'I know a few chords but changes are slow',
      dailyMinutes: 20,
      daysPerWeek: 5,
      preferredFormats: ['video'],
      language: 'en',
      createdAt: new Date('2026-09-02T10:00:00.000Z').toISOString(),
      updatedAt: new Date('2026-09-02T10:00:00.000Z').toISOString(),
      techniques: [
        technique({
          id: 'tec_test_1',
          pathId: id,
          order: 0,
          resources: [
            {
              id: 'res_test_1',
              techniqueId: 'tec_test_1',
              format: 'video',
              title: 'Get faster chord changes',
              url: 'https://www.youtube.com/watch?v=abc123',
              thumbnailUrl: 'https://img.test/abc.jpg',
              source: 'JustinGuitar',
              durationSec: 420,
              selectionReason: 'Drills the exact transition at beginner tempo.',
            },
          ],
        }),
        technique({ id: 'tec_test_2', pathId: id, order: 1, status: 'locked' }),
      ],
    };
  }

  it('is idempotent when the same device returns', async () => {
    const again = await repositories.users.findOrCreateByDeviceId(DEVICE_ID);

    expect(again.id).toBe(userId);
  });

  it('round-trips a whole path through Postgres', async () => {
    const saved = await repositories.paths.save(samplePath());
    const loaded = await repositories.paths.findById(saved.id);

    expect(loaded).toEqual(saved);
    expect(loaded?.techniques).toHaveLength(2);
    expect(loaded?.techniques[0]?.resources[0]?.source).toBe('JustinGuitar');
    expect(loaded?.preferredFormats).toEqual(['video']);
  });

  it('returns techniques in path order', async () => {
    const path = samplePath();
    // Save them out of order to prove ordering is not incidental.
    await repositories.paths.save({ ...path, techniques: [...path.techniques].reverse() });

    const loaded = await repositories.paths.findById(path.id);

    expect(loaded?.techniques.map((item) => item.order)).toEqual([0, 1]);
  });

  it('finds the path owning a technique', async () => {
    const saved = await repositories.paths.save(samplePath());

    const found = await repositories.paths.findByTechniqueId('tec_test_2');

    expect(found?.id).toBe(saved.id);
  });

  it('summarises progress per user', async () => {
    const path = samplePath();
    await repositories.paths.save({
      ...path,
      techniques: [
        { ...path.techniques[0]!, status: 'completed' },
        path.techniques[1]!,
      ],
    });

    const [summary] = await repositories.paths.listByUser(userId);

    expect(summary?.techniqueCount).toBe(2);
    expect(summary?.completedCount).toBe(1);
  });

  /**
   * Someone learning two hobbies sees the one they practised most recently.
   * Focus is ordering rather than a stored flag, so there is nothing to keep
   * in sync and nothing to migrate.
   */
  it('lists the most recently practised path first', async () => {
    const guitar = await repositories.paths.save(samplePath('path_guitar'));
    const chess = await repositories.paths.save({
      ...samplePath('path_chess'),
      skill: 'chess',
      techniques: [technique({ id: 'tec_chess_1', pathId: 'path_chess' })],
    });

    expect((await repositories.paths.listByUser(userId)).map((p) => p.id)).toEqual([
      chess.id,
      guitar.id,
    ]);

    // Practising guitar again moves it back into focus.
    await repositories.paths.save(guitar);

    expect((await repositories.paths.listByUser(userId)).map((p) => p.id)).toEqual([
      guitar.id,
      chess.id,
    ]);
  });

  it('updates a technique in place without duplicating it', async () => {
    const path = samplePath();
    await repositories.paths.save(path);

    const updated = await repositories.paths.save({
      ...path,
      techniques: [
        { ...path.techniques[0]!, status: 'completed', confidence: 'solid', struggleCount: 2 },
        path.techniques[1]!,
      ],
    });

    expect(updated.techniques).toHaveLength(2);
    expect(updated.techniques[0]?.status).toBe('completed');
    expect(updated.techniques[0]?.confidence).toBe('solid');
    expect(updated.techniques[0]?.struggleCount).toBe(2);
  });

  it('drops techniques removed from the path', async () => {
    const path = samplePath();
    await repositories.paths.save(path);

    const updated = await repositories.paths.save({
      ...path,
      techniques: [path.techniques[0]!],
    });

    expect(updated.techniques).toHaveLength(1);
    expect(await prisma.technique.findUnique({ where: { id: 'tec_test_2' } })).toBeNull();
  });

  /**
   * The reason techniques are upserted rather than deleted and recreated: a
   * generated lesson is expensive, and every reflection re-saves the path.
   */
  it('keeps generated content across a path save', async () => {
    const path = samplePath();
    await repositories.paths.save(path);

    await repositories.techniqueContent.save('tec_test_1', 'drill', {
      format: 'drill',
      steps: ['Set the metronome to 60bpm.', 'Play G to C for four minutes.'],
      durationMinutes: 10,
      successCriteria: 'No break in rhythm across ten changes.',
    });

    await repositories.paths.save({
      ...path,
      techniques: [{ ...path.techniques[0]!, status: 'completed' }, path.techniques[1]!],
    });

    const content = await repositories.techniqueContent.find('tec_test_1', 'drill');
    expect(content?.format).toBe('drill');
  });

  it('stores generated content per format', async () => {
    await repositories.paths.save(samplePath());

    await repositories.techniqueContent.save('tec_test_1', 'flashcards', {
      format: 'flashcards',
      cards: Array.from({ length: 5 }, (_unused, index) => ({
        front: `Prompt ${index}`,
        back: `Answer ${index}`,
      })),
    });

    expect(await repositories.techniqueContent.find('tec_test_1', 'flashcards')).not.toBeNull();
    expect(await repositories.techniqueContent.find('tec_test_1', 'drill')).toBeNull();
  });

  it('persists the resource cache so a search is paid for once', async () => {
    const candidates = [
      {
        id: 'video-1',
        format: 'video' as const,
        title: 'Result',
        url: 'https://example.test/1',
        thumbnailUrl: null,
        source: 'Test',
        durationSec: 300,
        description: null,
      },
    ];

    await repositories.resourceCache.save('test-key-1', candidates);
    const cached = await repositories.resourceCache.find('test-key-1');

    expect(cached?.candidates).toEqual(candidates);
    expect(cached?.cachedAt).toBeLessThanOrEqual(Date.now());
  });

  it('accumulates quota spend for the day', async () => {
    await prisma.quotaUsage.deleteMany({ where: { resource: 'test-resource' } });

    await repositories.quota.consume('test-resource', 100);
    await repositories.quota.consume('test-resource', 1);

    expect(await repositories.quota.consumedToday('test-resource')).toBe(101);
  });
});
