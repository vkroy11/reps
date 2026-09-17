import type { PrismaClient } from '@prisma/client';
import { TechniqueContentSchema } from '@reps/core';
import type { TechniqueContentRepository } from '../types';

/** Lesson bodies and decks, generated on first open and kept. */
export function createTechniqueContentRepository(prisma: PrismaClient): TechniqueContentRepository {
  return {
    async find(techniqueId, format) {
      const row = await prisma.techniqueContent.findUnique({
        where: { techniqueId_format: { techniqueId, format } },
      });
      if (!row) return null;

      // Json comes back as unknown, so it is re-validated rather than cast.
      const parsed = TechniqueContentSchema.safeParse(row.content);

      return parsed.success ? parsed.data : null;
    },

    async save(techniqueId, format, content) {
      await prisma.techniqueContent.upsert({
        where: { techniqueId_format: { techniqueId, format } },
        create: { techniqueId, format, content },
        update: { content },
      });
    },
  };
}
