import { z } from 'zod';
import { ConfidenceSchema, ContentFormatSchema } from './domain';

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
