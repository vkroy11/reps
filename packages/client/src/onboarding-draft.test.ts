import { describe, expect, it } from 'vitest';
import {
  createDraftStore,
  emptyDraft,
  firstIncompleteStep,
  flowProgress,
  isQuestionStep,
  isStepComplete,
  onboardingFlow,
  onboardingSteps,
  stepAfter,
  stepBefore,
  toOnboardingInput,
  type OnboardingDraft,
} from './onboarding-draft';
import { createMemoryStorage, storageKey } from './storage';

const complete: OnboardingDraft = {
  skill: 'guitar',
  goal: 'play 5 songs at a campfire',
  level: 'I know a few chords but changes are slow',
  dailyMinutes: 20,
  daysPerWeek: 5,
  preferredFormats: ['video'],
  language: 'en',
};

describe('step completion', () => {
  it('treats whitespace as unanswered', () => {
    expect(isStepComplete('skill', { skill: '   ' })).toBe(false);
    expect(isStepComplete('skill', { skill: 'guitar' })).toBe(true);
  });

  it('requires both parts of the time question', () => {
    expect(isStepComplete('time', { dailyMinutes: 20 })).toBe(false);
    expect(isStepComplete('time', { dailyMinutes: 20, daysPerWeek: 5 })).toBe(true);
  });
});

describe('firstIncompleteStep', () => {
  /** Reopening the app should resume, not restart the questionnaire. */
  it('resumes at the first unanswered question', () => {
    expect(firstIncompleteStep(emptyDraft)).toBe('skill');
    expect(firstIncompleteStep({ skill: 'guitar' })).toBe('goal');
    expect(firstIncompleteStep({ ...complete, language: undefined })).toBe('formats');
    expect(firstIncompleteStep(complete)).toBe('formats');
  });

  it('does not skip a gap left by going back and clearing an answer', () => {
    expect(firstIncompleteStep({ ...complete, goal: undefined })).toBe('goal');
  });
});

describe('toOnboardingInput', () => {
  it('refuses to build a request from a partial draft', () => {
    expect(toOnboardingInput({ skill: 'guitar' })).toBeNull();
    expect(toOnboardingInput(emptyDraft)).toBeNull();
  });

  it('builds the API request body once every answer exists', () => {
    expect(toOnboardingInput(complete)).toMatchObject({
      skill: 'guitar',
      dailyMinutes: 20,
      preferredFormats: ['video'],
      language: 'en',
    });
  });

  /** Formats are genuinely optional; language falls back rather than blocking. */
  it('defaults formats and language', () => {
    const input = toOnboardingInput({
      ...complete,
      preferredFormats: undefined,
      language: undefined,
    });

    expect(input).toMatchObject({ preferredFormats: [], language: 'en' });
  });

  it('rejects values the API would reject', () => {
    expect(toOnboardingInput({ ...complete, dailyMinutes: 0 })).toBeNull();
    expect(toOnboardingInput({ ...complete, daysPerWeek: 9 })).toBeNull();
  });
});

describe('draft store', () => {
  it('round-trips a draft', async () => {
    const store = createDraftStore(createMemoryStorage());

    await store.save(complete);

    expect(await store.load()).toEqual(complete);
  });

  it('starts empty and clears', async () => {
    const store = createDraftStore(createMemoryStorage());

    expect(await store.load()).toEqual(emptyDraft);
    await store.save(complete);
    await store.clear();
    expect(await store.load()).toEqual(emptyDraft);
  });

  /** A corrupt draft must not brick the one flow a user cannot skip. */
  it('recovers from unparseable stored data', async () => {
    const storage = createMemoryStorage();
    await storage.setItem(storageKey.onboardingDraft, '{not json');

    expect(await createDraftStore(storage).load()).toEqual(emptyDraft);
  });

  it('discards a stored draft whose shape no longer matches', async () => {
    const storage = createMemoryStorage();
    await storage.setItem(storageKey.onboardingDraft, JSON.stringify({ dailyMinutes: 'twenty' }));

    expect(await createDraftStore(storage).load()).toEqual(emptyDraft);
  });
});

describe('the immersive flow order', () => {
  it('puts each interstitial after the answer it reframes', () => {
    expect([...onboardingFlow]).toEqual([
      'skill',
      'goal',
      'cheer1',
      'level',
      'time',
      'cheer2',
      'formats',
    ]);
  });

  it('keeps every question in the flow', () => {
    expect(onboardingFlow.filter(isQuestionStep)).toEqual([...onboardingSteps]);
  });

  it('walks forwards and lands on generating past the last question', () => {
    expect(stepAfter('skill')).toBe('goal');
    expect(stepAfter('goal')).toBe('cheer1');
    expect(stepAfter('cheer2')).toBe('formats');
    expect(stepAfter('formats')).toBe('generating');
  });

  it('walks backwards and stops before the first question', () => {
    expect(stepBefore('goal')).toBe('skill');
    expect(stepBefore('level')).toBe('cheer1');
    expect(stepBefore('skill')).toBeNull();
  });

  /**
   * The ring counts position in the whole flow, interstitials included, so it
   * keeps moving on a screen that holds no answer. Counting questions instead
   * would leave it frozen through both cheers.
   */
  it('advances the ring on an interstitial too', () => {
    expect(flowProgress('goal')).toBeLessThan(flowProgress('cheer1'));
    expect(flowProgress('cheer1')).toBeLessThan(flowProgress('level'));
  });

  it('fills the ring exactly on the last question', () => {
    expect(flowProgress('formats')).toBe(1);
  });
});
