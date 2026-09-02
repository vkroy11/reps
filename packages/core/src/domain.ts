import { z } from 'zod';

/**
 * How a skill is actually learned. This drives which practice format a
 * technique gets, so a timing skill never becomes a reading exercise.
 */
export const skillArchetypes = ['motor', 'strategic', 'recall', 'craft'] as const;
export const SkillArchetypeSchema = z.enum(skillArchetypes);
export type SkillArchetype = z.infer<typeof SkillArchetypeSchema>;

/** The primary way the learner practises a single technique. */
export const modalities = ['watch_and_do', 'drill', 'flashcards', 'produce_and_critique'] as const;
export const ModalitySchema = z.enum(modalities);
export type Modality = z.infer<typeof ModalitySchema>;

/** Formats a learner can say they prefer, and that a resource can be. */
export const contentFormats = ['video', 'article', 'ai_lesson', 'flashcards', 'drill'] as const;
export const ContentFormatSchema = z.enum(contentFormats);
export type ContentFormat = z.infer<typeof ContentFormatSchema>;

export const techniqueStatuses = ['locked', 'active', 'completed', 'skipped'] as const;
export const TechniqueStatusSchema = z.enum(techniqueStatuses);
export type TechniqueStatus = z.infer<typeof TechniqueStatusSchema>;

/**
 * Self-assessed confidence after a practice session. Completion is gated on
 * this rather than on how much of a video was watched.
 */
export const confidenceLevels = ['struggling', 'getting_there', 'solid'] as const;
export const ConfidenceSchema = z.enum(confidenceLevels);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const ResourceSchema = z.object({
  id: z.string(),
  techniqueId: z.string(),
  format: ContentFormatSchema,
  title: z.string(),
  url: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  source: z.string(),
  durationSec: z.number().int().nonnegative().nullable(),
  /** One line on why this resource was chosen for this learner. */
  selectionReason: z.string(),
});
export type Resource = z.infer<typeof ResourceSchema>;

export const TechniqueSchema = z.object({
  id: z.string(),
  pathId: z.string(),
  /** Position in the path. Contiguous from 0 after any insert or removal. */
  order: z.number().int().nonnegative(),
  title: z.string(),
  /** Why this matters, phrased against the learner's stated goal. */
  whyItMatters: z.string(),
  modality: ModalitySchema,
  /** The concrete rep to perform, e.g. "G -> C -> G -> D, 10 clean reps". */
  practicePrompt: z.string(),
  estimatedMinutes: z.number().int().positive(),
  status: TechniqueStatusSchema,
  confidence: ConfidenceSchema.nullable(),
  /** How many times the learner reported struggling. Drives intervention. */
  struggleCount: z.number().int().nonnegative(),
  /** Set when this technique was inserted as an easier step before another. */
  bridgeForTechniqueId: z.string().nullable(),
  /**
   * Kept so resources can be curated lazily when the technique is first
   * opened, rather than searching for all 5-8 techniques upfront.
   */
  searchQueries: z.array(z.string()),
  resources: z.array(ResourceSchema),
});
export type Technique = z.infer<typeof TechniqueSchema>;

export const LearningPathSchema = z.object({
  id: z.string(),
  userId: z.string(),
  skill: z.string(),
  archetype: SkillArchetypeSchema,
  goal: z.string(),
  level: z.string(),
  dailyMinutes: z.number().int().positive(),
  daysPerWeek: z.number().int().min(1).max(7),
  preferredFormats: z.array(ContentFormatSchema),
  language: z.string(),
  createdAt: z.string(),
  techniques: z.array(TechniqueSchema),
});
export type LearningPath = z.infer<typeof LearningPathSchema>;

export const LearningPathSummarySchema = LearningPathSchema.omit({ techniques: true }).extend({
  techniqueCount: z.number().int().nonnegative(),
  completedCount: z.number().int().nonnegative(),
});
export type LearningPathSummary = z.infer<typeof LearningPathSummarySchema>;
