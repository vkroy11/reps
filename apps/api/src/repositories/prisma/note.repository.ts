import type { PrismaClient } from '@prisma/client';
import { NoteAnchorSchema, type Note, type NoteWithContext } from '@reps/core';
import type { NoteRepository } from '../types';

interface NoteRow {
  id: string;
  userId: string;
  techniqueId: string;
  resourceId: string | null;
  timestampSec: number | null;
  anchor: unknown;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

/** An unparseable anchor is dropped, not thrown - the note body still reads. */
function toDomainNote(row: NoteRow): Note {
  const parsed = NoteAnchorSchema.safeParse(row.anchor);

  return {
    id: row.id,
    userId: row.userId,
    techniqueId: row.techniqueId,
    resourceId: row.resourceId,
    timestampSec: row.timestampSec,
    anchor: parsed.success ? parsed.data : null,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createNoteRepository(prisma: PrismaClient): NoteRepository {
  return {
    async create(note) {
      const row = await prisma.note.create({
        data: {
          id: note.id,
          userId: note.userId,
          techniqueId: note.techniqueId,
          resourceId: note.resourceId,
          timestampSec: note.timestampSec,
          anchor: note.anchor ?? undefined,
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
  };
}
