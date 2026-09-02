/**
 * The error taxonomy. Services throw these to signal intent; only the error
 * handler knows about HTTP status codes.
 */
export type ErrorCode =
  | 'ValidationError'
  | 'Unauthorized'
  | 'NotFound'
  | 'Conflict'
  | 'ProviderUnavailable'
  | 'ProviderInvalidOutput'
  | 'RateLimited'
  | 'QuotaExhausted'
  | 'InternalServerError';

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('Unauthorized', message, 401);
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super('NotFound', `${entity} '${id}' not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('Conflict', message, 409);
  }
}

/** The upstream model or API failed, timed out, or refused the request. */
export class ProviderUnavailableError extends AppError {
  constructor(provider: string, message: string) {
    super('ProviderUnavailable', `${provider}: ${message}`, 503);
  }
}

/** The model answered, but not in the shape we require - even after a repair attempt. */
export class ProviderInvalidOutputError extends AppError {
  constructor(provider: string, details?: unknown) {
    super(
      'ProviderInvalidOutput',
      `${provider} returned output that does not match the expected schema`,
      502,
      details,
    );
  }
}

/**
 * A per-minute limit was hit. Distinct from QuotaExhausted because it clears
 * on its own - Groq's free tier allows 1,000 requests/day but only 8K
 * tokens/minute, so this is the limit that actually bites, and retrying works.
 */
export class RateLimitedError extends AppError {
  constructor(
    provider: string,
    readonly retryAfterSeconds?: number,
  ) {
    super('RateLimited', `${provider} is rate limited`, 429);
  }
}

/**
 * A daily external quota is spent. Retrying will not help today. Callers are
 * expected to degrade rather than fail: YouTube's 10,000 units/day allows only
 * ~100 searches.
 */
export class QuotaExhaustedError extends AppError {
  constructor(resource: string) {
    super('QuotaExhausted', `Daily quota for ${resource} is exhausted`, 429);
  }
}
