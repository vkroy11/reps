import { describe, expect, it } from 'vitest';
import { envSchema, productionEnvSchema } from './env.schema';

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

  /**
   * These were enforced only when the code path that needs them ran, so a
   * misconfigured deploy went green and broke on the first sign-in instead.
   */
  describe('the production-only rules', () => {
    const base = { NODE_ENV: 'production', SESSION_SECRET: 'a-real-secret' };

    it('refuses to start in production with no session secret', () => {
      const result = productionEnvSchema.safeParse({ NODE_ENV: 'production' });

      expect(result.success).toBe(false);
      expect(JSON.stringify(result.error?.issues)).toContain('SESSION_SECRET');
    });

    it('refuses the fake identity provider in production', () => {
      const result = productionEnvSchema.safeParse({ ...base, AUTH_PROVIDER: 'fake' });

      expect(result.success).toBe(false);
      expect(JSON.stringify(result.error?.issues)).toContain('any identity');
    });

    it('reports everything wrong at once, not one thing per deploy', () => {
      const result = productionEnvSchema.safeParse({
        NODE_ENV: 'production',
        AUTH_PROVIDER: 'fake',
      });

      expect(result.error?.issues).toHaveLength(2);
    });

    it('accepts a correctly configured production environment', () => {
      expect(productionEnvSchema.safeParse(base).success).toBe(true);
    });

    /** A dev machine keeps the random-per-boot key, which is the point of it. */
    it('leaves development alone', () => {
      expect(productionEnvSchema.safeParse({}).success).toBe(true);
      expect(productionEnvSchema.safeParse({ AUTH_PROVIDER: 'fake' }).success).toBe(true);
    });
  });
});
