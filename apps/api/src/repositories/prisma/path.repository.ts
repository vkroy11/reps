import type { PrismaClient } from '@prisma/client';
import type { LearningPathSummary } from '@reps/core';
import type { LearningPathWrite, PathRepository } from '../types';
import { toDomainPath, toResourceRow, toTechniqueRow } from './mappers';
import type { Totals } from './totals';

const withTechniques = { techniques: { include: { resources: true } } } as const;

/** Learning paths, always read back with their techniques and resources. */
export function createPathRepository(prisma: PrismaClient, totals: Totals): PathRepository {
  const { pathTotals, totalsForPaths } = totals;

  return {
    /**
     * Saves the aggregate. Techniques are upserted rather than deleted and
     * recreated, because their ids are referenced by generated content -
     * wiping them would throw away every lesson and card deck on each save.
     * Resources are small and always replaced wholesale.
     */
    async save(path: LearningPathWrite) {
      await prisma.$transaction(async (tx) => {
        const row = {
          userId: path.userId,
          skill: path.skill,
          archetype: path.archetype,
          goal: path.goal,
          level: path.level,
          dailyMinutes: path.dailyMinutes,
          daysPerWeek: path.daysPerWeek,
          preferredFormats: path.preferredFormats,
          language: path.language,
          createdAt: new Date(path.createdAt),
        };

        await tx.learningPath.upsert({
          where: { id: path.id },
          create: { id: path.id, ...row },
          update: row,
        });

        const keptIds = path.techniques.map((technique) => technique.id);
        await tx.technique.deleteMany({
          where: { pathId: path.id, id: { notIn: keptIds } },
        });

        for (const technique of path.techniques) {
          const { id, pathId, ...fields } = toTechniqueRow(technique);

          await tx.technique.upsert({
            where: { id },
            create: { id, pathId, ...fields },
            update: fields,
          });

          await tx.resource.deleteMany({ where: { techniqueId: id } });
          if (technique.resources.length > 0) {
            await tx.resource.createMany({
              data: technique.resources.map(toResourceRow),
            });
          }
        }
      });

      const [saved, totals] = await Promise.all([
        prisma.learningPath.findUniqueOrThrow({
          where: { id: path.id },
          include: withTechniques,
        }),
        pathTotals(path.id),
      ]);

      return toDomainPath(saved, totals);
    },

    async findById(id) {
      const row = await prisma.learningPath.findUnique({
        where: { id },
        include: withTechniques,
      });
      if (!row) return null;

      return toDomainPath(row, await pathTotals(id));
    },

    async findByTechniqueId(techniqueId) {
      const row = await prisma.learningPath.findFirst({
        where: { techniques: { some: { id: techniqueId } } },
        include: withTechniques,
      });
      if (!row) return null;

      return toDomainPath(row, await pathTotals(row.id));
    },

    async listByUser(userId): Promise<LearningPathSummary[]> {
      const rows = await prisma.learningPath.findMany({
        where: { userId },
        // Tie-broken so two paths saved in the same instant still have a
        // deterministic focus order.
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        include: {
          techniques: { select: { status: true } },
          _count: { select: { techniques: true } },
        },
      });

      // One grouped query and one badge query for the whole list, rather than
      // two per path - the list is the app's first request on every launch.
      const totals = await totalsForPaths(rows.map((row) => row.id));

      return rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        skill: row.skill,
        archetype: row.archetype as LearningPathSummary['archetype'],
        goal: row.goal,
        level: row.level,
        dailyMinutes: row.dailyMinutes,
        daysPerWeek: row.daysPerWeek,
        preferredFormats: row.preferredFormats as LearningPathSummary['preferredFormats'],
        language: row.language,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        techniqueCount: row._count.techniques,
        completedCount: row.techniques.filter((technique) => technique.status === 'completed')
          .length,
        xp: totals[row.id]?.xp ?? 0,
        badges: totals[row.id]?.badges ?? [],
      }));
    },
  };
}
