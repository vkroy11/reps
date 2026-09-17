import type { PrismaClient } from '@prisma/client';
import type { Badge } from '@reps/core';
import { toDomainBadge, type PathTotals } from './mappers';

/**
 * Derived totals for a path: XP, badges and per-technique minutes.
 *
 * Shared because two repositories need the same numbers - `paths` folds them
 * into a path it returns, and `progress` exposes them directly - and a second
 * implementation would be a second chance to count XP differently.
 */
export function createTotals(prisma: PrismaClient) {
  /**
   * XP, badges and per-technique minutes for one path.
   *
   * Two aggregate queries rather than loading the session rows: a path with a
   * long history could accumulate hundreds of sessions, and the only thing
   * needed from them is two sums.
   */
  async function pathTotals(pathId: string): Promise<PathTotals> {
    const [grouped, badgeRows] = await Promise.all([
      prisma.practiceSession.groupBy({
        by: ['techniqueId'],
        where: { pathId },
        _sum: { minutes: true, xp: true },
      }),
      prisma.badge.findMany({ where: { pathId }, orderBy: { stage: 'asc' } }),
    ]);

    const minutesByTechnique: Record<string, number> = {};
    let xp = 0;

    for (const group of grouped) {
      minutesByTechnique[group.techniqueId] = group._sum.minutes ?? 0;
      xp += group._sum.xp ?? 0;
    }

    return { xp, badges: badgeRows.map(toDomainBadge), minutesByTechnique };
  }

  /** XP and badges for many paths in two queries, whatever the list length. */
  async function totalsForPaths(
    pathIds: string[],
  ): Promise<Record<string, { xp: number; badges: Badge[] }>> {
    const totals: Record<string, { xp: number; badges: Badge[] }> = {};
    for (const pathId of pathIds) totals[pathId] = { xp: 0, badges: [] };

    if (pathIds.length === 0) return totals;

    const [grouped, badgeRows] = await Promise.all([
      prisma.practiceSession.groupBy({
        by: ['pathId'],
        where: { pathId: { in: pathIds } },
        _sum: { xp: true },
      }),
      prisma.badge.findMany({ where: { pathId: { in: pathIds } }, orderBy: { stage: 'asc' } }),
    ]);

    for (const group of grouped) {
      const entry = totals[group.pathId];
      if (entry) entry.xp = group._sum.xp ?? 0;
    }
    for (const row of badgeRows) totals[row.pathId]?.badges.push(toDomainBadge(row));

    return totals;
  }

  return { pathTotals, totalsForPaths };
}

export type Totals = ReturnType<typeof createTotals>;
