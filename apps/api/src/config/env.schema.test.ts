import { describe, expect, it } from 'vitest';
import { envSchema } from './env.schema';

describe('envSchema', () => {
  it('applies defaults when nothing is set', () => {
    const env = envSchema.parse({});

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(4000);
    expect(env.AI_PROVIDER).toBe('groq');
    expect(env.YOUTUBE_DAILY_UNIT_BUDGET).toBe(8000);
  });

  /**
   * Regression: a blank `GROQ_MODEL=` used to parse as "", which defeated the
   * `?? fallback` in the provider and sent an empty model id to Groq.
   */
  it('treats a blank variable as unset so fallbacks fire', () => {
    const env = envSchema.parse({ GROQ_MODEL: '', GROQ_API_KEY: '   ', DATABASE_URL: '' });

    expect(env.GROQ_MODEL).toBeUndefined();
    expect(env.GROQ_API_KEY).toBeUndefined();
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.GROQ_MODEL ?? 'openai/gpt-oss-120b').toBe('openai/gpt-oss-120b');
  });

  it('keeps real values', () => {
    const env = envSchema.parse({ GROQ_MODEL: 'openai/gpt-oss-20b', PORT: '5000' });

    expect(env.GROQ_MODEL).toBe('openai/gpt-oss-20b');
    expect(env.PORT).toBe(5000);
  });

  it('rejects an unknown provider', () => {
    expect(() => envSchema.parse({ AI_PROVIDER: 'openai' })).toThrow();
  });
});
