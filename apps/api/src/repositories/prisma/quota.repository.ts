import type { PrismaClient } from '@prisma/client';
import type { QuotaRepository } from '../types';

/** Units spent per external API per day, so a day's budget is enforceable. */
export function createQuotaRepository(prisma: PrismaClient): QuotaRepository {
  const today = (): string => new Date().toISOString().slice(0, 10);

  return {
    async consumedToday(resource) {
      const row = await prisma.quotaUsage.findUnique({
        where: { resource_day: { resource, day: today() } },
      });

      return row?.units ?? 0;
    },

    async consume(resource, units) {
      const day = today();

      await prisma.quotaUsage.upsert({
        where: { resource_day: { resource, day } },
        create: { resource, day, units },
        update: { units: { increment: units } },
      });
    },
  };
}
