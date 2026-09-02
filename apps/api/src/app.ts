import cors from 'cors';
import express, { type Express } from 'express';
import { pinoHttp } from 'pino-http';
import { logger } from './config/logger';
import type { Container } from './container';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { createApiRouter } from './routes';

export function createApp(container: Container): Express {
  const app = express();

  app.use(pinoHttp({ logger }));
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.use(
    '/api',
    createApiRouter({ services: container.services, repositories: container.repositories }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
