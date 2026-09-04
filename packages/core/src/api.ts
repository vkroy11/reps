import { z } from 'zod';
import { ConfidenceSchema, ContentFormatSchema, LearningPathSchema } from './domain';
import { XpAwardSchema } from './progress';

/** Request contracts. The API validates against these; the client reuses them. */

export const OnboardingInputSchema = z.object({
  skill: z.string().min(2).max(60),
  goal: z.string().min(3).max(200),
  level: z.string().min(2).max(200),
  dailyMinutes: z.number().int().min(5).max(240),
  daysPerWeek: z.number().int().min(1).max(7),
  preferredFormats: z.array(ContentFormatSchema).max(5).default([]),
  /** ISO-ish language code used to bias resource search. */
  language: z.string().min(2).max(20).default('en'),
});
export type OnboardingInput = z.infer<typeof OnboardingInputSchema>;

export const SuggestionsRequestSchema = z.object({
  skill: z.string().min(2).max(60),
});
export type SuggestionsRequest = z.infer<typeof SuggestionsRequestSchema>;

export const ReflectRequestSchema = z.object({
  confidence: ConfidenceSchema,
  /** Minutes actually practised, when the client tracked a timer. */
  practiceMinutes: z.number().int().min(0).max(600).optional(),
});
export type ReflectRequest = z.infer<typeof ReflectRequestSchema>;

/**
 * What a reflection produced: the path as it now stands, whether the learner
 * has struggled enough to be offered help, and what the session earned.
 */
export const ReflectResultSchema = z.object({
  path: LearningPathSchema,
  intervention: z.literal('offer_bridge').nullable(),
  awarded: XpAwardSchema,
});
export type ReflectResult = z.infer<typeof ReflectResultSchema>;

export const CreateNoteRequestSchema = z.object({
  techniqueId: z.string().min(1),
  resourceId: z.string().min(1).nullable().optional(),
  timestampSec: z.number().int().nonnegative().max(86_400).nullable().optional(),
  body: z.string().trim().min(1).max(2000),
});
export type CreateNoteRequest = z.infer<typeof CreateNoteRequestSchema>;

export const UpdateNoteRequestSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});
export type UpdateNoteRequest = z.infer<typeof UpdateNoteRequestSchema>;
