import type { GenerateContentInput } from '../providers/ai/types';
import type { LearningPath, OnboardingInput } from '@reps/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { createContainer } from '../container';
import { createFakeAiProvider } from '../providers/ai/fake.provider';
import { createFakeResourceProvider } from '../providers/resources/fake.provider';
import { createMemoryRepositories } from '../repositories/memory';
import type { Services } from './index';

const INPUT: OnboardingInput = {
  skill: 'go syntax',
  goal: 'read and write basic Go without looking things up',
  level: 'I write TypeScript daily',
  dailyMinutes: 15,
  daysPerWeek: 5,
  preferredFormats: ['flashcards'],
  language: 'en',
};

const USER = 'usr_owner';

describe('content service', () => {
  let services: Services;
  let path: LearningPath;
  /** Every generation request, so the prompt inputs can be asserted. */
  let calls: GenerateContentInput[];

  beforeEach(async () => {
    calls = [];
    const ai = createFakeAiProvider();
    const spied = {
      ...ai,
      generateContent: (input: GenerateContentInput) => {
        calls.push(input);

        return ai.generateContent(input);
      },
    };

    services = createContainer({
      ai: spied,
      resources: createFakeResourceProvider(),
      repositories: createMemoryRepositories(),
    }).services;

    path = await services.paths.create(USER, INPUT);
  });

  function first() {
    const technique = path.techniques[0];
    if (!technique) throw new Error('fixture has no techniques');

    return technique;
  }

  it('generates once and serves the stored copy after that', async () => {
    await services.content.get(USER, first().id);
    await services.content.get(USER, first().id);

    expect(calls).toHaveLength(1);
  });

  /**
   * The repeat case. Handing back the same deck in the same order stops
   * measuring recall of the answers and starts measuring recall of the list -
   * by the third pass the learner is answering from position.
   */
  describe('when the learner comes back to a technique', () => {
    it('generates a new variant instead of replaying the stored one', async () => {
      await services.content.get(USER, first().id);
      await services.content.get(USER, first().id, undefined, { fresh: true });

      expect(calls).toHaveLength(2);
    });

    it('tells the model what was already used, so it can vary against it', async () => {
      const original = await services.content.get(USER, first().id);
      await services.content.get(USER, first().id, undefined, { fresh: true });

      expect(calls[0]?.previous).toBeUndefined();
      expect(calls[1]?.previous).toEqual(original);
    });

    it('replaces the stored copy, so the next plain read gets the new one', async () => {
      await services.content.get(USER, first().id);
      const fresh = await services.content.get(USER, first().id, undefined, { fresh: true });
      const afterwards = await services.content.get(USER, first().id);

      expect(afterwards).toEqual(fresh);
      // The plain read after the regeneration must not have generated again.
      expect(calls).toHaveLength(2);
    });

    /** Nothing stored yet means it is a first attempt, not a repeat. */
    it('has nothing to vary against on a first request', async () => {
      await services.content.get(USER, first().id, undefined, { fresh: true });

      expect(calls).toHaveLength(1);
      expect(calls[0]?.previous).toBeUndefined();
    });
  });

  it('passes the learner’s language through to every generation', async () => {
    const hindi = await services.paths.create(USER, { ...INPUT, language: 'hi' });
    const technique = hindi.techniques[0];
    if (!technique) throw new Error('fixture has no techniques');

    await services.content.get(USER, technique.id);

    expect(calls.at(-1)?.context.language).toBe('hi');
  });

  it('refuses a technique belonging to someone else', async () => {
    await expect(services.content.get('usr_someone_else', first().id)).rejects.toThrow();
  });
});
