import { PrismaClient } from '@prisma/client';
import {
  TechniqueContentSchema,
  ResourceCandidateSchema,
  type Badge,
  type LearningPathSummary,
  type Note,
  type NoteWithContext,
} from '@reps/core';
import { z } from 'zod';
import { newId } from '../../lib/ids';
import type { LearningPathWrite, Repositories } from '../types';
import {
  toDomainBadge,
  toDomainPath,
  toResourceRow,
  toTechniqueRow,
  type PathTotals,
} from './mappers';

const CandidatesSchema = z.array(ResourceCandidateSchema);

const withTechniques = { techniques: { include: { resources: true } } } as const;

interface NoteRow {
  id: string;
  userId: string;
  techniqueId: string;
  resourceId: string | null;
  timestampSec: number | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Prisma's duplicate-key error. Matched on the code rather than by importing
 * PrismaClientKnownRequestError, which is not exported from the generated
 * client's public entry point in this version.
 */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

function toDomainNote(row: NoteRow): Note {
  return {
    id: row.id,
    userId: row.userId,
    techniqueId: row.techniqueId,
    resourceId: row.resourceId,
    timestampSec: row.timestampSec,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createPrismaRepositories(prisma: PrismaClient): Repositories {
  const today = (): string => new Date().toISOString().slice(0, 10);

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

  return {
    users: {
      async findOrCreateByDeviceId(deviceId) {
        const user = await prisma.user.upsert({
          where: { deviceId },
          create: { id: newId('usr'), deviceId },
          update: {},
        });

        return { id: user.id, deviceId: user.deviceId, createdAt: user.createdAt.toISOString() };
      },
    },

    paths: {
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

    },

    notes: {
      async create(note) {
        const row = await prisma.note.create({
          data: {
            id: note.id,
            userId: note.userId,
            techniqueId: note.techniqueId,
            resourceId: note.resourceId,
            timestampSec: note.timestampSec,
            body: note.body,
          },
        });

        return toDomainNote(row);
      },

      async findById(noteId) {
        const row = await prisma.note.findUnique({ where: { id: noteId } });

        return row ? toDomainNote(row) : null;
      },

      async listByTechnique(userId, techniqueId) {
        const rows = await prisma.note.findMany({
          where: { userId, techniqueId },
          // Timestamped notes first, in playback order; untimed ones after.
          orderBy: [{ timestampSec: 'asc' }, { createdAt: 'asc' }],
        });

        return rows.map(toDomainNote);
      },

      async listByUser(userId): Promise<NoteWithContext[]> {
        const rows = await prisma.note.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          include: { technique: { include: { path: { select: { id: true, skill: true } } } } },
        });

        return rows.map((row) => ({
          ...toDomainNote(row),
          techniqueTitle: row.technique.title,
          pathId: row.technique.path.id,
          skill: row.technique.path.skill,
        }));
      },

      async update(noteId, body) {
        const row = await prisma.note.update({ where: { id: noteId }, data: { body } });

        return toDomainNote(row);
      },

      async remove(noteId) {
        await prisma.note.delete({ where: { id: noteId } });
      },
    },

    techniqueContent: {
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
    },

    resourceCache: {
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
    },

    progress: {
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
          select: { createdAt: true, minutes: true, xp: true, pathId: true },
        });

        return rows.map((row) => ({
          at: row.createdAt.toISOString(),
          minutes: row.minutes,
          xp: row.xp,
          pathId: row.pathId,
        }));
      },

      pathTotals,
      totalsForPaths,
    },

    quota: {
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
    },
  };
}
