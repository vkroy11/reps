import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { createFakeAiProvider } from './fake.provider';
import { createGeminiModel } from './gemini.model';
import { createGroqModel } from './groq.model';
import { createModelBackedAiProvider } from './model-backed.provider';
import type { AiProvider } from './types';

export type { AiProvider } from './types';

/**
 * Chooses a provider from config. When the selected provider has no key the
 * API falls back to the fake rather than refusing to boot, so the app is
 * always runnable - useful for a reviewer cloning the repo with no keys.
 */
export function createAiProvider(): AiProvider {
  if (env.AI_PROVIDER === 'fake') return createFakeAiProvider();

  if (env.AI_PROVIDER === 'gemini') {
    if (!env.GEMINI_API_KEY) return warnAndFallback('gemini');

    return createModelBackedAiProvider({
      planner: createGeminiModel({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL }),
      helper: createGeminiModel({
        apiKey: env.GEMINI_API_KEY,
        model: env.GEMINI_HELPER_MODEL ?? 'gemini-2.5-flash-lite',
      }),
    });
  }

  if (!env.GROQ_API_KEY) return warnAndFallback('groq');

  return createModelBackedAiProvider({
    planner: createGroqModel({ apiKey: env.GROQ_API_KEY, model: env.GROQ_MODEL }),
    helper: createGroqModel({
      apiKey: env.GROQ_API_KEY,
      model: env.GROQ_HELPER_MODEL ?? 'openai/gpt-oss-20b',
    }),
  });
}

function warnAndFallback(provider: string): AiProvider {
  logger.warn(`AI_PROVIDER=${provider} but no API key is set - using the fake provider`);

  return createFakeAiProvider();
}
