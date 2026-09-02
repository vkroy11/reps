import { ProviderUnavailableError, QuotaExhaustedError, RateLimitedError } from '../../lib/errors';
import type { JsonModel } from './json-model';

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 45_000;

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
}

/**
 * Groq's free tier allows 1,000 requests/day but only 8K tokens/minute, which
 * is why the pipeline makes several small calls instead of one large one.
 */
export function createGroqModel(options: { apiKey: string; model?: string }): JsonModel {
  const modelId = options.model ?? 'openai/gpt-oss-120b';

  return {
    name: `groq:${modelId}`,

    async complete({ system, user, maxTokens }) {
      let response: Response;

      try {
        response = await fetch(ENDPOINT, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${options.apiKey}`,
          },
          body: JSON.stringify({
            model: modelId,
            temperature: 0.4,
            max_completion_tokens: maxTokens ?? 2000,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (error) {
        throw new ProviderUnavailableError('groq', (error as Error).message);
      }

      if (response.status === 429) {
        // Groq returns 429 for both the per-minute limit and the daily one.
        // Only the wording distinguishes them, and only one is worth retrying.
        const body = await response.text();
        if (/per day|daily/i.test(body)) throw new QuotaExhaustedError('Groq');

        const retryAfter = Number(response.headers.get('retry-after'));
        throw new RateLimitedError('groq', Number.isFinite(retryAfter) ? retryAfter : undefined);
      }

      if (!response.ok) {
        // Include the body: "HTTP 400" alone is undiagnosable in production.
        const detail = (await response.text().catch(() => '')).slice(0, 300);
        throw new ProviderUnavailableError('groq', `HTTP ${response.status} ${detail}`);
      }

      const body = (await response.json()) as ChatCompletionResponse;
      const content = body.choices?.[0]?.message?.content;

      if (!content) throw new ProviderUnavailableError('groq', 'Empty completion');

      return content;
    },
  };
}
