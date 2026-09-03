import type { NextFunction, Request, Response } from 'express';
import { ZodError, z } from 'zod';
import { logger } from '../config/logger';
import { AppError, RateLimitedError } from '../lib/errors';

/**
 * The only place that knows about HTTP status codes. Services throw from the
 * error taxonomy in lib/errors and this maps them.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ZodError) {
    res.status(400).json({ error: 'ValidationError', details: z.treeifyError(error) });

    return;
  }

  // body-parser rejects malformed JSON with a SyntaxError carrying its own
  // status. Without this it fell through to the 500 branch, which blamed the
  // server for a request the client got wrong.
  if (isBodyParserError(error)) {
    res.status(error.status).json({ error: 'MalformedRequestBody', message: error.message });

    return;
  }

  if (error instanceof AppError) {
    // Expected conditions - a bad id or a spent quota is not a server fault.
    logger.info({ code: error.code, status: error.status }, error.message);

    // Tell the client how long to wait instead of making it guess.
    if (error instanceof RateLimitedError) {
      res.setHeader('Retry-After', String(error.retryAfterSeconds ?? 10));
    }

    res.status(error.status).json({
      error: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    });

    return;
  }

  logger.error({ err: error }, 'Unhandled error');
  res.status(500).json({ error: 'InternalServerError' });
}

interface BodyParserError extends Error {
  status: number;
  type: string;
}

/**
 * Every body-parser failure - unparseable JSON, a body over the size limit, a
 * charset it cannot decode - arrives as an Error with `status` and a `type`
 * prefixed `entity.` or `encoding.`. Checking the shape rather than the message
 * keeps this independent of body-parser's wording.
 */
function isBodyParserError(error: unknown): error is BodyParserError {
  if (!(error instanceof Error)) return false;

  const candidate = error as Partial<BodyParserError>;

  return (
    typeof candidate.status === 'number' &&
    candidate.status >= 400 &&
    candidate.status < 500 &&
    typeof candidate.type === 'string' &&
    (candidate.type.startsWith('entity.') || candidate.type.startsWith('encoding.'))
  );
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'NotFound' });
}
