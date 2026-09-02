import type { NextFunction, Request, Response } from 'express';
import { ZodError, z } from 'zod';
import { logger } from '../config/logger';

// TODO: replace the generic 500 branch with the typed error taxonomy
// (NotFound / Conflict / ProviderUnavailable / QuotaExhausted ...) so services
// can signal intent without knowing about HTTP.
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

  logger.error({ err: error }, 'Unhandled error');
  res.status(500).json({ error: 'InternalServerError' });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'NotFound' });
}
