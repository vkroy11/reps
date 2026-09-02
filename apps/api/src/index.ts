import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { createContainer } from './container';
import { disconnectRepositories } from './repositories';

const app = createApp(createContainer());

const server = app.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    logger.info(`${signal} received, shutting down`);
    server.close(() => {
      void disconnectRepositories().finally(() => process.exit(0));
    });
  });
}
