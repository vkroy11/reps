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
  /**
   * Every Google OAuth client id that may appear in an ID token's `aud`.
   *
   * Comma-separated because there is one per platform - web, iOS, Android -
   * and a token minted for any of them is legitimate. Verifying against a
   * single id would reject two thirds of real sign-ins.
   *
   * Optional: with none set, sign-in is simply unavailable and the app says so
   * rather than offering a button that cannot work.
   */
  GOOGLE_OAUTH_CLIENT_IDS: optionalString,
  /**
   * Signing key for our own session tokens.
   *
   * Required in production and only there: a dev machine with no secret set
   * gets a random one per boot, which invalidates sessions on restart - fine
   * locally, and much better than a checked-in default that reaches a deploy.
   */
  SESSION_SECRET: optionalString,
  /** How long a session token lasts before the app has to sign in again. */
  SESSION_DAYS: z.coerce.number().int().positive().default(90),
});

export type Env = z.infer<typeof envSchema>;
