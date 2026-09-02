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

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'NotFound' });
}
