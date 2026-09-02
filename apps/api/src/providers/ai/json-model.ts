import type { ZodType, z } from 'zod';
import { logger } from '../../config/logger';
import { ProviderInvalidOutputError, RateLimitedError } from '../../lib/errors';

/**
 * The only thing a model transport has to do: take a prompt, return text.
 * Groq and Gemini differ here and nowhere else.
 */
export interface JsonModel {
  readonly name: string;
  complete(request: { system: string; user: string; maxTokens?: number }): Promise<string>;
}

/** Long enough to clear a per-minute window, short enough not to hang a request. */
const RATE_LIMIT_RETRY_CAP_MS = 12_000;
const DEFAULT_RETRY_AFTER_SECONDS = 5;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A per-minute rate limit is transient, so it gets one wait-and-retry rather
 * than degrading the learner's path. Anything else propagates immediately.
 */
async function completeWithRetry(
  model: JsonModel,
  request: { system: string; user: string; maxTokens?: number },
): Promise<string> {
  try {
    return await model.complete(request);
  } catch (error) {
    if (!(error instanceof RateLimitedError)) throw error;

    const waitMs = Math.min(
      (error.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS) * 1000,
      RATE_LIMIT_RETRY_CAP_MS,
    );
    logger.warn({ provider: model.name, waitMs }, 'Rate limited, retrying once');
    await sleep(waitMs);

    return model.complete(request);
  }
}

/** Models wrap JSON in prose or fences often enough that this is not optional. */
function extractJson(raw: string): unknown {
  const withoutFences = raw.replace(/```(?:json)?/gi, '').trim();
  const start = withoutFences.search(/[[{]/);
  const end = Math.max(withoutFences.lastIndexOf('}'), withoutFences.lastIndexOf(']'));

  if (start === -1 || end === -1 || end < start) {
    throw new SyntaxError('No JSON object found in model output');
  }

  return JSON.parse(withoutFences.slice(start, end + 1));
}

/**
 * Calls the model and validates the result against a schema. On failure it
 * makes exactly one repair attempt, feeding the validation error back, then
 * gives up with a typed error so callers can degrade rather than 500.
 */
export async function generateJson<Schema extends ZodType>(
  model: JsonModel,
  schema: Schema,
  request: { system: string; user: string; maxTokens?: number },
): Promise<z.infer<Schema>> {
  const firstAttempt = await completeWithRetry(model, request);
  const firstResult = parse(schema, firstAttempt);

  if (firstResult.ok) return firstResult.data;

  logger.warn(
    { provider: model.name, issues: firstResult.issues },
    'Model output failed validation, attempting repair',
  );

  const repaired = await completeWithRetry(model, {
    ...request,
    user: [
      request.user,
      '',
      'Your previous reply was rejected by the schema validator.',
      `Errors: ${JSON.stringify(firstResult.issues)}`,
      'Previous reply:',
      firstAttempt.slice(0, 2000),
      '',
      'Return corrected JSON only. No explanation.',
    ].join('\n'),
  });

  const repairedResult = parse(schema, repaired);
  if (repairedResult.ok) return repairedResult.data;

  throw new ProviderInvalidOutputError(model.name, repairedResult.issues);
}

type ParseResult<T> = { ok: true; data: T } | { ok: false; issues: unknown };

function parse<Schema extends ZodType>(schema: Schema, raw: string): ParseResult<z.infer<Schema>> {
  let candidate: unknown;

  try {
    candidate = extractJson(raw);
  } catch (error) {
    return { ok: false, issues: [(error as Error).message] };
  }

  const result = schema.safeParse(candidate);

  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, issues: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) };
}
