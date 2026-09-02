import { pino } from 'pino';
import { env, isProduction } from './env';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : isProduction ? 'info' : 'debug',
  transport: isProduction ? undefined : { target: 'pino-pretty', options: { colorize: true } },
});
