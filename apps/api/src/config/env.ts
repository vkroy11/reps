import path from 'node:path';
import { config } from 'dotenv';
import { z } from 'zod';

// Supports running from the repo root or from apps/api.
config({
  path: [path.resolve(process.cwd(), '.env'), path.resolve(process.cwd(), '../../.env')],
  quiet: true,
});

// Keys are optional while the features that need them are still being built.
// Tighten each one to `.min(1)` as its feature lands, so a misconfigured
// deploy fails at boot rather than on the first request.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().optional(),
  AI_PROVIDER: z.enum(['groq', 'gemini']).default('groq'),
  GROQ_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  YOUTUBE_API_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  JWT_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment:', z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
