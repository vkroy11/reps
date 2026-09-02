import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { createMemoryRepositories } from './memory';
import { createPrismaRepositories } from './prisma';
import type { Repositories } from './types';

export type { Repositories } from './types';

let prisma: PrismaClient | undefined;

/** Single client for the process; Prisma pools connections internally. */
export function getPrismaClient(): PrismaClient {
  prisma ??= new PrismaClient();

  return prisma;
}

export async function disconnectRepositories(): Promise<void> {
  await prisma?.$disconnect();
  prisma = undefined;
}

/**
 * Postgres when DATABASE_URL is set, in-memory otherwise. The fallback is not
 * a toy: it keeps tests hermetic and lets someone clone the repo and run the
 * API with no database installed. Both satisfy the same interfaces.
 */
export function createRepositories(): Repositories {
  if (!env.DATABASE_URL) {
    logger.warn('DATABASE_URL is not set - using in-memory storage, data resets on restart');

    return createMemoryRepositories();
  }

  logger.info('Using Postgres storage');

  return createPrismaRepositories(getPrismaClient());
}
