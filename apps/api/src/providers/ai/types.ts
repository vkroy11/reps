import type {
  GeneratedContentFormat,
  GeneratedPath,
  GeneratedTechnique,
  Modality,
  OnboardingInput,
  OnboardingSuggestions,
  RankedResources,
  ResourceCandidate,
  SkillArchetype,
  TechniqueContent,
} from '@reps/core';

/** The learner's situation, passed to every generation call. */
export interface PathContext {
  skill: string;
  goal: string;
  level: string;
  language: string;
  dailyMinutes: number;
  daysPerWeek: number;
  preferredFormats: readonly string[];
}

export interface RankResourcesInput {
  context: PathContext;
  technique: { title: string; whyItMatters: string; modality: Modality };
  candidates: readonly ResourceCandidate[];
}

export interface GenerateContentInput {
  context: PathContext;
  technique: { title: string; whyItMatters: string; practicePrompt: string; modality: Modality };
  format: GeneratedContentFormat;
  /**
   * What this technique produced last time, when the learner is repeating it.
   *
   * Present only on a repeat. The prompt uses it to avoid handing back the
   * same deck in the same order - practising against cards you have already
   * memorised the position of measures recall of the list, not of the answers.
   */
  previous?: TechniqueContent;
}

export interface RegenerateTailInput {
  context: PathContext;
  archetype: SkillArchetype;
  completedTitles: readonly string[];
  rejectedTitle: string;
  count: number;
}

export interface GenerateBridgeInput {
  context: PathContext;
  hardTechnique: { title: string; whyItMatters: string };
  completedTitles: readonly string[];
}

/**
 * Everything the application needs from a model. Implementations are selected
 * by env config, so swapping Groq for Gemini never touches a service.
 */
export interface AiProvider {
  readonly name: string;
  suggestOnboarding(skill: string): Promise<OnboardingSuggestions>;
  generatePath(input: OnboardingInput): Promise<GeneratedPath>;
  regenerateTail(input: RegenerateTailInput): Promise<GeneratedTechnique[]>;
  generateBridge(input: GenerateBridgeInput): Promise<GeneratedTechnique>;
  rankResources(input: RankResourcesInput): Promise<RankedResources>;
  generateContent(input: GenerateContentInput): Promise<TechniqueContent>;
}
