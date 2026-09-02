import { ProviderUnavailableError, QuotaExhaustedError } from '../../lib/errors';
import type { JsonModel } from './json-model';

const REQUEST_TIMEOUT_MS = 45_000;

interface GenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

/**
 * Gemini's free tier is $0 for flash models. Its rate limits are account
 * specific and shown in AI Studio rather than published, so treat them as
 * something to confirm rather than assume.
 */
export function createGeminiModel(options: { apiKey: string; model?: string }): JsonModel {
  const modelId = options.model ?? 'gemini-2.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;

  return {
    name: `gemini:${modelId}`,

    async complete({ system, user, maxTokens }) {
      let response: Response;

      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': options.apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: maxTokens ?? 2000,
              responseMimeType: 'application/json',
            },
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (error) {
        throw new ProviderUnavailableError('gemini', (error as Error).message);
      }

      if (response.status === 429) throw new QuotaExhaustedError('Gemini');
      if (!response.ok) {
        const detail = (await response.text().catch(() => '')).slice(0, 300);
        throw new ProviderUnavailableError('gemini', `HTTP ${response.status} ${detail}`);
      }

      const body = (await response.json()) as GenerateContentResponse;
      const text = body.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new ProviderUnavailableError('gemini', 'Empty completion');

      return text;
    },
  };
}
