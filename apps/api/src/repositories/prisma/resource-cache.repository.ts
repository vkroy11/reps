import type { PrismaClient } from '@prisma/client';
import { ResourceCandidateSchema } from '@reps/core';
import { z } from 'zod';
import type { ResourceCacheRepository } from '../types';

const CandidatesSchema = z.array(ResourceCandidateSchema);

/** Search results by query hash, so a repeat search costs no quota. */
export function createResourceCacheRepository(prisma: PrismaClient): ResourceCacheRepository {
  return {
    async find(key) {
      const row = await prisma.resourceCacheEntry.findUnique({ where: { key } });
      if (!row) return null;

      const parsed = CandidatesSchema.safeParse(row.candidates);
      if (!parsed.success) return null;

      return { candidates: parsed.data, cachedAt: row.cachedAt.getTime() };
    },

    async save(key, candidates) {
      const payload = { candidates, cachedAt: new Date() };

      await prisma.resourceCacheEntry.upsert({
        where: { key },
        create: { key, ...payload },
        update: payload,
      });
    },
  };
}
