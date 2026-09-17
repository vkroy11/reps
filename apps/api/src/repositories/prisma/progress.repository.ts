import type { PrismaClient } from '@prisma/client';
import type { Confidence } from '@reps/core';
import type { ProgressRepository } from '../types';
import { isUniqueViolation } from './errors';
import { toDomainBadge } from './mappers';
import type { Totals } from './totals';

/** Practice sessions and the badges they earn. */
export function createProgressRepository(prisma: PrismaClient, totals: Totals): ProgressRepository {
  const { pathTotals, totalsForPaths } = totals;

  return {
    async recordSession(session) {
      const row = await prisma.practiceSession.create({
        data: {
          id: session.id,
          userId: session.userId,
          pathId: session.pathId,
          techniqueId: session.techniqueId,
          minutes: session.minutes,
          xp: session.xp,
          confidence: session.confidence,
        },
      });

      return { ...session, createdAt: row.createdAt.toISOString() };
    },

    async isFirstReflection(techniqueId) {
      const existing = await prisma.practiceSession.findFirst({
        where: { techniqueId },
        select: { id: true },
      });

      return existing === null;
    },

    /**
     * Leans on the `(pathId, stage)` unique constraint rather than checking
     * first: a read-then-write would let two concurrent reflects both see no
     * badge and both insert. The constraint makes the second one fail, and a
     * P2002 here means "already awarded", not an error.
     */
    async awardBadge(badge) {
      try {
        const row = await prisma.badge.create({
          data: {
            id: badge.id,
            userId: badge.userId,
            pathId: badge.pathId,
            stage: badge.stage,
            label: badge.label,
          },
        });

        return toDomainBadge(row);
      } catch (error) {
        if (isUniqueViolation(error)) return null;

        throw error;
      }
    },

    async recentSessions(userId, limit) {
      const rows = await prisma.practiceSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          createdAt: true,
          minutes: true,
          xp: true,
          pathId: true,
          techniqueId: true,
          confidence: true,
        },
      });

      return rows.map((row) => ({
        at: row.createdAt.toISOString(),
        minutes: row.minutes,
        xp: row.xp,
        pathId: row.pathId,
        techniqueId: row.techniqueId,
        confidence: row.confidence as Confidence,
      }));
    },

    pathTotals,
    totalsForPaths,
  };
}
