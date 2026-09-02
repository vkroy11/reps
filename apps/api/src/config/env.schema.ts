import { z } from 'zod';

/**
 * An unset variable and a blank one (`GROQ_MODEL=`) mean the same thing.
 * Without this, dotenv yields "" and `?? fallback` never fires, so a blank
 * line in .env silently becomes a real value - which is how an empty model id
 * reached the Groq API and came back 404.
 */
const optionalString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().optional(),
);

/**
 * Keys are optional while the features that need them are still being built.
 * Tighten each one as its feature lands, so a misconfigured deploy fails at
 * boot rather than on the first request.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: optionalString,
  AI_PROVIDER: z.enum(['groq', 'gemini', 'fake']).default('groq'),
  GROQ_API_KEY: optionalString,
  GROQ_MODEL: optionalString,
  /** Rate limits are per model, so short-form work runs on its own budget. */
  GROQ_HELPER_MODEL: optionalString,
  GEMINI_API_KEY: optionalString,
  GEMINI_MODEL: optionalString,
  GEMINI_HELPER_MODEL: optionalString,
  YOUTUBE_API_KEY: optionalString,
  /** Guard rail below YouTube's 10,000 units/day so testing cannot spend it all. */
  YOUTUBE_DAILY_UNIT_BUDGET: z.coerce.number().int().positive().default(8000),
  GOOGLE_CLIENT_ID: optionalString,
  JWT_SECRET: optionalString,
});

export type Env = z.infer<typeof envSchema>;
