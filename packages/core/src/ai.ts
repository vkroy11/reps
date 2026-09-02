import { z } from 'zod';
import { ContentFormatSchema, ModalitySchema, SkillArchetypeSchema } from './domain';

/**
 * Contracts for everything a model is allowed to produce.
 *
 * Note what is absent: URLs. A model asked for video links returns plausible
 * dead ones, so it may only emit search *intent* and the resource layer
 * resolves that against a real API.
 */

/** A path short enough to finish is the whole point of the product. */
export const MIN_TECHNIQUES = 5;
export const MAX_TECHNIQUES = 8;

export const GeneratedTechniqueSchema = z.object({
  title: z.string().min(3).max(80),
  whyItMatters: z.string().min(10).max(300),
  modality: ModalitySchema,
  practicePrompt: z.string().min(5).max(400),
  estimatedMinutes: z.number().int().min(5).max(90),
  searchQueries: z.array(z.string().min(3).max(120)).min(1).max(3),
});
export type GeneratedTechnique = z.infer<typeof GeneratedTechniqueSchema>;

export const GeneratedPathSchema = z.object({
  archetype: SkillArchetypeSchema,
  techniques: z.array(GeneratedTechniqueSchema).min(MIN_TECHNIQUES).max(MAX_TECHNIQUES),
});
export type GeneratedPath = z.infer<typeof GeneratedPathSchema>;

/** Used for tail regeneration and single bridging steps, where the count varies. */
export const GeneratedTechniqueListSchema = z.object({
  techniques: z.array(GeneratedTechniqueSchema).min(1).max(MAX_TECHNIQUES),
});
export type GeneratedTechniqueList = z.infer<typeof GeneratedTechniqueListSchema>;

/**
 * The model picks from candidates the resource layer found; it never invents
 * them. `candidateId` must match an id that was passed in.
 */
export const RankedResourcesSchema = z.object({
  selections: z
    .array(
      z.object({
        candidateId: z.string().min(1),
        reason: z.string().min(5).max(200),
      }),
    )
    .min(1)
    .max(2),
});
export type RankedResources = z.infer<typeof RankedResourcesSchema>;

export const LessonContentSchema = z.object({
  format: z.literal('ai_lesson'),
  title: z.string().min(3).max(120),
  /** Markdown. Short by design - this is a micro-lesson, not an article. */
  body: z.string().min(50).max(4000),
  keyPoints: z.array(z.string().min(3).max(200)).min(2).max(5),
});

export const FlashcardsContentSchema = z.object({
  format: z.literal('flashcards'),
  cards: z
    .array(
      z.object({
        front: z.string().min(1).max(200),
        back: z.string().min(1).max(400),
      }),
    )
    .min(5)
    .max(12),
});

export const DrillContentSchema = z.object({
  format: z.literal('drill'),
  steps: z.array(z.string().min(3).max(300)).min(2).max(6),
  durationMinutes: z.number().int().min(1).max(60),
  successCriteria: z.string().min(5).max(300),
});

export const TechniqueContentSchema = z.discriminatedUnion('format', [
  LessonContentSchema,
  FlashcardsContentSchema,
  DrillContentSchema,
]);
export type TechniqueContent = z.infer<typeof TechniqueContentSchema>;

/**
 * Skill-specific onboarding options. Generic "Beginner / Intermediate /
 * Advanced" lists are the tell of a generic product, so the model writes
 * descriptors for the actual skill.
 */
export const OnboardingSuggestionsSchema = z.object({
  archetype: SkillArchetypeSchema,
  goals: z
    .array(z.object({ label: z.string().min(3).max(80), description: z.string().min(5).max(200) }))
    .min(3)
    .max(4),
  levels: z
    .array(z.object({ label: z.string().min(3).max(80), description: z.string().min(5).max(200) }))
    .min(3)
    .max(4),
});
export type OnboardingSuggestions = z.infer<typeof OnboardingSuggestionsSchema>;

/** A resource candidate from the resource layer, offered to the model for ranking. */
export const ResourceCandidateSchema = z.object({
  id: z.string(),
  format: ContentFormatSchema,
  title: z.string(),
  url: z.string(),
  thumbnailUrl: z.string().nullable(),
  source: z.string(),
  durationSec: z.number().int().nonnegative().nullable(),
  description: z.string().nullable(),
});
export type ResourceCandidate = z.infer<typeof ResourceCandidateSchema>;
