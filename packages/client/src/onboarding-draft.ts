import { ContentFormatSchema, OnboardingInputSchema, type OnboardingInput } from '@reps/core';
import { z } from 'zod';
import { createJsonStore, storageKey, type Storage } from './storage';

/**
 * A partially answered onboarding flow.
 *
 * Every field is optional because the draft is saved after each answer -
 * closing the app halfway must lose nothing, which matters more here than
 * anywhere else in the product because this is the one screen sequence a user
 * cannot skip.
 */
export const OnboardingDraftSchema = z.object({
  skill: z.string().optional(),
  goal: z.string().optional(),
  level: z.string().optional(),
  dailyMinutes: z.number().int().optional(),
  daysPerWeek: z.number().int().optional(),
  preferredFormats: z.array(ContentFormatSchema).optional(),
  language: z.string().optional(),
});

export type OnboardingDraft = z.infer<typeof OnboardingDraftSchema>;

export const emptyDraft: OnboardingDraft = {};

/** The five questions, in order. Used for the progress bar and back navigation. */
export const onboardingSteps = ['skill', 'goal', 'level', 'time', 'formats'] as const;
export type OnboardingStep = (typeof onboardingSteps)[number];

/** Which answer each step is responsible for. */
const REQUIRED_BY_STEP: Record<OnboardingStep, (draft: OnboardingDraft) => boolean> = {
  skill: (draft) => isFilled(draft.skill),
  goal: (draft) => isFilled(draft.goal),
  level: (draft) => isFilled(draft.level),
  time: (draft) => draft.dailyMinutes !== undefined && draft.daysPerWeek !== undefined,
  formats: (draft) => draft.language !== undefined,
};

function isFilled(value: string | undefined): boolean {
  return value !== undefined && value.trim().length > 0;
}

export function isStepComplete(step: OnboardingStep, draft: OnboardingDraft): boolean {
  return REQUIRED_BY_STEP[step](draft);
}

/**
 * The first unanswered step, so reopening the app resumes where the learner
 * stopped instead of restarting the questionnaire.
 */
export function firstIncompleteStep(draft: OnboardingDraft): OnboardingStep {
  return onboardingSteps.find((step) => !isStepComplete(step, draft)) ?? 'formats';
}

/**
 * Promotes a finished draft to the request body the API validates. Returns
 * null while anything is missing, so the caller cannot submit a partial answer
 * set by mistake.
 */
export function toOnboardingInput(draft: OnboardingDraft): OnboardingInput | null {
  const parsed = OnboardingInputSchema.safeParse({
    ...draft,
    // Defaults live here rather than in the screens: formats are genuinely
    // optional, and language falls back rather than blocking the flow.
    preferredFormats: draft.preferredFormats ?? [],
    language: draft.language ?? 'en',
  });

  return parsed.success ? parsed.data : null;
}

export function createDraftStore(storage: Storage) {
  const json = createJsonStore(storage);

  return {
    async load(): Promise<OnboardingDraft> {
      const draft = await json.read(storageKey.onboardingDraft, (value) => {
        const parsed = OnboardingDraftSchema.safeParse(value);

        return parsed.success ? parsed.data : null;
      });

      return draft ?? emptyDraft;
    },

    async save(draft: OnboardingDraft): Promise<void> {
      await json.write(storageKey.onboardingDraft, draft);
    },

    async clear(): Promise<void> {
      await json.clear(storageKey.onboardingDraft);
    },
  };
}

export type DraftStore = ReturnType<typeof createDraftStore>;
