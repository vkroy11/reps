import type { PrismaClient } from '@prisma/client';
import type { Repositories } from '../types';
import { createNoteRepository } from './note.repository';
import { createPathRepository } from './path.repository';
import { createProgressRepository } from './progress.repository';
import { createQuotaRepository } from './quota.repository';
import { createResourceCacheRepository } from './resource-cache.repository';
import { createTechniqueContentRepository } from './technique-content.repository';
import { createTotals } from './totals';
import { createUserRepository } from './user.repository';

/**
 * The Postgres implementation of every repository port, composed.
 *
 * One file per aggregate rather than one file per backing store. The previous
 * shape was a single 515-line function returning all seven, which meant any
 * question about notes involved scrolling past users and paths, and the
 * helpers each repository needed were all in scope for all of them whether
 * they belonged there or not. The seams are the ones `../types.ts` already
 * declares, so this file is only the wiring.
 *
 * `totals` is shared deliberately: paths and progress both need the same XP
 * and badge sums, and two implementations would be two ways to count.
 */
export function createPrismaRepositories(prisma: PrismaClient): Repositories {
  const totals = createTotals(prisma);

  return {
    users: createUserRepository(prisma),
    paths: createPathRepository(prisma, totals),
    notes: createNoteRepository(prisma),
    techniqueContent: createTechniqueContentRepository(prisma),
    resourceCache: createResourceCacheRepository(prisma),
    progress: createProgressRepository(prisma, totals),
    quota: createQuotaRepository(prisma),
  };
}
