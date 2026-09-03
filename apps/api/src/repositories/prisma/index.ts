import { PrismaClient } from '@prisma/client';
import {
  TechniqueContentSchema,
  ResourceCandidateSchema,
  type LearningPath,
  type LearningPathSummary,
  type Note,
  type NoteWithContext,
} from '@reps/core';
import { z } from 'zod';
import { newId } from '../../lib/ids';
import type { Repositories } from '../types';
import { toDomainPath, toResourceRow, toTechniqueRow } from './mappers';

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
      async save(path: LearningPath) {
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

        const saved = await prisma.learningPath.findUniqueOrThrow({
          where: { id: path.id },
          include: withTechniques,
        });

        return toDomainPath(saved);
      },

      async findById(id) {
        const row = await prisma.learningPath.findUnique({
          where: { id },
          include: withTechniques,
        });

        return row ? toDomainPath(row) : null;
      },

      async findByTechniqueId(techniqueId) {
        const row = await prisma.learningPath.findFirst({
          where: { techniques: { some: { id: techniqueId } } },
          include: withTechniques,
        });

        return row ? toDomainPath(row) : null;
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
