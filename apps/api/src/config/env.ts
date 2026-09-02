import path from 'node:path';
import { config } from 'dotenv';
import { z } from 'zod';
import { envSchema } from './env.schema';

// Supports running from the repo root or from apps/api.
config({
  path: [path.resolve(process.cwd(), '.env'), path.resolve(process.cwd(), '../../.env')],
  quiet: true,
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment:', z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
