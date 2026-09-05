import type { LearningPath, OnboardingInput } from '@reps/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { createContainer } from '../container';
import { createFakeAiProvider } from '../providers/ai/fake.provider';
import { createFakeResourceProvider } from '../providers/resources/fake.provider';
import { createMemoryRepositories } from '../repositories/memory';
import type { Services } from './index';

const INPUT: OnboardingInput = {
  skill: 'guitar',
  goal: 'play 5 songs at a campfire',
  level: 'I know a few chords but changes are slow',
  dailyMinutes: 20,
  daysPerWeek: 5,
  preferredFormats: ['video'],
  language: 'en',
};

const USER_ID = 'usr_test';

describe('technique service', () => {
  let services: Services;
  let path: LearningPath;

  beforeEach(async () => {
    services = createContainer({
      ai: createFakeAiProvider(),
      resources: createFakeResourceProvider(),
      repositories: createMemoryRepositories(),
    }).services;

    path = await services.paths.create(USER_ID, INPUT);
  });

  function techniqueAt(current: LearningPath, index: number) {
    const technique = current.techniques[index];
    if (!technique) throw new Error(`No technique at index ${index}`);

    return technique;
  }

  it('starts with the first technique active and the rest locked', () => {
    expect(techniqueAt(path, 0).status).toBe('active');
    expect(path.techniques.slice(1).every((technique) => technique.status === 'locked')).toBe(true);
  });

  it('completes a technique on solid confidence and activates the next one', async () => {
    const { path: updated, intervention } = await services.techniques.reflect(
      USER_ID,
      techniqueAt(path, 0).id,
      { confidence: 'solid' },
    );

    expect(techniqueAt(updated, 0).status).toBe('completed');
    expect(techniqueAt(updated, 0).confidence).toBe('solid');
    expect(techniqueAt(updated, 1).status).toBe('active');
    expect(intervention).toBeNull();
  });

  it('keeps a technique active when the learner is not confident yet', async () => {
    const { path: updated, intervention } = await services.techniques.reflect(
      USER_ID,
      techniqueAt(path, 0).id,
      { confidence: 'getting_there' },
    );

    expect(techniqueAt(updated, 0).status).toBe('active');
    expect(techniqueAt(updated, 1).status).toBe('locked');
    expect(intervention).toBeNull();
  });

  it('offers help after a second struggle, not the first', async () => {
    const techniqueId = techniqueAt(path, 0).id;

    const first = await services.techniques.reflect(USER_ID, techniqueId, {
      confidence: 'struggling',
    });
    expect(first.intervention).toBeNull();

    const second = await services.techniques.reflect(USER_ID, techniqueId, {
      confidence: 'struggling',
    });
    expect(second.intervention).toBe('offer_bridge');
    expect(techniqueAt(second.path, 0).struggleCount).toBe(2);
  });

  it('rejects reflecting on a technique that is not active', async () => {
    await expect(
      services.techniques.reflect(USER_ID, techniqueAt(path, 1).id, { confidence: 'solid' }),
    ).rejects.toMatchObject({ code: 'Conflict' });
  });

  describe('too hard', () => {
    it('inserts an easier step in front instead of removing the technique', async () => {
      const hard = techniqueAt(path, 0);
      const updated = await services.techniques.markTooHard(USER_ID, hard.id);

      expect(updated.techniques).toHaveLength(path.techniques.length + 1);

      const bridge = techniqueAt(updated, 0);
      expect(bridge.bridgeForTechniqueId).toBe(hard.id);
      expect(bridge.status).toBe('active');

      const demoted = updated.techniques.find((technique) => technique.id === hard.id);
      expect(demoted?.status).toBe('locked');
      expect(demoted?.order).toBe(1);
    });

    it('keeps the order contiguous after inserting', async () => {
      const updated = await services.techniques.markTooHard(USER_ID, techniqueAt(path, 0).id);

      expect(updated.techniques.map((technique) => technique.order)).toEqual(
        updated.techniques.map((_unused, index) => index),
      );
    });
  });

  describe('not for me', () => {
    it('skips the technique and regenerates only what came after it', async () => {
      const completed = await services.techniques.reflect(USER_ID, techniqueAt(path, 0).id, {
        confidence: 'solid',
      });
      const rejected = techniqueAt(completed.path, 1);

      const updated = await services.techniques.skip(USER_ID, rejected.id);

      expect(techniqueAt(updated, 0).status).toBe('completed');
      expect(techniqueAt(updated, 0).id).toBe(techniqueAt(path, 0).id);

      const skipped = updated.techniques.find((technique) => technique.id === rejected.id);
      expect(skipped?.status).toBe('skipped');

      // Everything after the rejected technique is new.
      const originalTailIds = path.techniques.slice(2).map((technique) => technique.id);
      const survivingTailIds = updated.techniques.slice(2).map((technique) => technique.id);
      /*
        Every original id must be gone, not merely "not all of them present".
        `not.toEqual(arrayContaining(...))` only fails when the whole original
        tail survives, so one leftover locked step passed.
      */
      for (const originalId of originalTailIds) {
        expect(survivingTailIds).not.toContain(originalId);
      }
    });

    it('activates a replacement when the skipped technique was the active one', async () => {
      const updated = await services.techniques.skip(USER_ID, techniqueAt(path, 0).id);

      expect(techniqueAt(updated, 0).status).toBe('skipped');
      expect(updated.techniques.filter((technique) => technique.status === 'active')).toHaveLength(
        1,
      );
    });

    it('refuses to skip completed work', async () => {
      const { path: updated } = await services.techniques.reflect(
        USER_ID,
        techniqueAt(path, 0).id,
        { confidence: 'solid' },
      );

      await expect(
        services.techniques.skip(USER_ID, techniqueAt(updated, 0).id),
      ).rejects.toMatchObject({ code: 'Conflict' });
    });
  });

  describe('ownership', () => {
    it("reports another user's technique as missing", async () => {
      await expect(
        services.techniques.reflect('usr_someone_else', techniqueAt(path, 0).id, {
          confidence: 'solid',
        }),
      ).rejects.toMatchObject({ code: 'NotFound' });
    });
  });

  describe('lazy curation', () => {
    it('curates resources only for the techniques a learner will reach today', () => {
      expect(techniqueAt(path, 0).resources.length).toBeGreaterThan(0);
      expect(techniqueAt(path, 1).resources.length).toBeGreaterThan(0);
      expect(techniqueAt(path, 2).resources).toHaveLength(0);
    });

    it('curates on first open', async () => {
      const later = techniqueAt(path, 3);
      expect(later.resources).toHaveLength(0);

      const opened = await services.techniques.ensureResources(USER_ID, later.id);
      expect(opened.resources.length).toBeGreaterThan(0);

      const reloaded = await services.paths.getOwned(USER_ID, path.id);
      expect(techniqueAt(reloaded, 3).resources.length).toBeGreaterThan(0);
    });
  });
});
