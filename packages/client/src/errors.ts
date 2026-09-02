/** Mirrors the API's error taxonomy so screens can branch on intent, not status codes. */
export type ApiErrorCode =
  | 'ValidationError'
  | 'Unauthorized'
  | 'NotFound'
  | 'Conflict'
  | 'ProviderUnavailable'
  | 'ProviderInvalidOutput'
  | 'RateLimited'
  | 'QuotaExhausted'
  | 'InternalServerError'
  /** The request never reached the API: offline, wrong host, or timed out. */
  | 'NetworkError'
  /** The API answered, but not in the shape the client expects. */
  | 'UnexpectedResponse';

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status?: number,
    /** Present on RateLimited, taken from the Retry-After header. */
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Worth showing a "try again" affordance for; the rest need a different action. */
  get isRetryable(): boolean {
    return (
      this.code === 'NetworkError' ||
      this.code === 'RateLimited' ||
      this.code === 'ProviderUnavailable' ||
      this.code === 'InternalServerError'
    );
  }

  /**
   * The path can still be built without external resources, so the UI offers
   * "continue without videos" rather than only a retry.
   */
  get isDegradable(): boolean {
    return this.code === 'QuotaExhausted' || this.code === 'ProviderUnavailable';
  }
}
