import type { CreateNoteRequest, Note, NoteWithContext } from '@reps/core';
import { NotFoundError } from '../lib/errors';
import { newId } from '../lib/ids';
import type { Repositories } from '../repositories/types';
import type { TechniqueService } from './technique.service';

export function createNoteService(deps: {
  repositories: Repositories;
  techniques: TechniqueService;
}) {
  /**
   * A note may only be read or changed by the person who wrote it, and a note
   * whose owner does not match is reported as missing rather than forbidden -
   * the API should not confirm that an id exists.
   */
  async function locateOwned(userId: string, noteId: string): Promise<Note> {
    const note = await deps.repositories.notes.findById(noteId);
    if (!note || note.userId !== userId) throw new NotFoundError('Note', noteId);

    return note;
  }

  /** What the notebook needs beyond the note itself. */
  function withContext(
    note: Note,
    path: { id: string; skill: string },
    technique: { title: string },
  ): NoteWithContext {
    return { ...note, pathId: path.id, skill: path.skill, techniqueTitle: technique.title };
  }

  return {
    /**
     * Notes hang off a technique, so the technique's ownership is checked
     * first: that also stops a note being attached to someone else's path.
     */
    async create(userId: string, input: CreateNoteRequest): Promise<NoteWithContext> {
      const { path, technique } = await deps.techniques.locate(userId, input.techniqueId);

      // A timestamp only means something against a specific resource.
      const resourceId =
        input.resourceId && technique.resources.some((item) => item.id === input.resourceId)
          ? input.resourceId
          : null;

      const now = new Date().toISOString();

      const note = await deps.repositories.notes.create({
        id: newId('note'),
        userId,
        techniqueId: technique.id,
        resourceId,
        timestampSec: resourceId === null ? null : (input.timestampSec ?? null),
        body: input.body.trim(),
        createdAt: now,
        updatedAt: now,
      });

      /*
        Answered with its context, not as a bare Note.

        The notebook lists notes across every path, so it needs the technique
        and skill they belong to. Leaving the client to supply that meant a
        caller could simply not - and one did, silently, which is how a written
        note updated the technique screen and nothing else. The service already
        holds both from the ownership check above.
      */
      return withContext(note, path, technique);
    },

    async listForTechnique(userId: string, techniqueId: string): Promise<Note[]> {
      // Ownership of the technique is what gates the notes on it.
      await deps.techniques.locate(userId, techniqueId);

      return deps.repositories.notes.listByTechnique(userId, techniqueId);
    },

    /** The notebook: everything the learner has written, newest first. */
    async listAll(userId: string): Promise<NoteWithContext[]> {
      return deps.repositories.notes.listByUser(userId);
    },

    async update(userId: string, noteId: string, body: string): Promise<NoteWithContext> {
      const owned = await locateOwned(userId, noteId);
      const { path, technique } = await deps.techniques.locate(userId, owned.techniqueId);

      return withContext(
        await deps.repositories.notes.update(noteId, body.trim()),
        path,
        technique,
      );
    },

    async remove(userId: string, noteId: string): Promise<void> {
      await locateOwned(userId, noteId);
      await deps.repositories.notes.remove(noteId);
    },
  };
}

export type NoteService = ReturnType<typeof createNoteService>;
