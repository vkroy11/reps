import cors from 'cors';
import express, { type Express } from 'express';
import { pinoHttp } from 'pino-http';
import { logger } from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { apiRouter } from './routes';

export function createApp(): Express {
  const app = express();

  app.use(pinoHttp({ logger }));
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
