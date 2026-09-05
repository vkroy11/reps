import { ApiError } from '@reps/client';
import type { CreateNoteRequest, Note, NoteWithContext } from '@reps/core';
import { useCallback, useEffect, useState } from 'react';
import { useNotebookCache } from './notebook-cache';
import { useApp } from '../../providers/app-provider';

function toApiError(caught: unknown): ApiError {
  return caught instanceof ApiError
    ? caught
    : new ApiError('UnexpectedResponse', (caught as Error).message);
}

interface TechniqueNotesState {
  notes: Note[];
  error: ApiError | null;
  loading: boolean;
  add: (input: Omit<CreateNoteRequest, 'techniqueId'>) => Promise<void>;
  edit: (noteId: string, body: string) => Promise<void>;
  remove: (noteId: string) => Promise<void>;
}

/**
 * Notes on one technique.
 *
 * Writes go to the API and the list is refetched, rather than being patched
 * locally: the server decides ordering (timestamped first, in playback order)
 * and whether a timestamp was accepted at all, so re-reading keeps the screen
 * honest about what was actually stored.
 */
export function useTechniqueNotes(techniqueId: string | null): TechniqueNotesState {
  const { applyNote, removeNote } = useNotebookCache();
  const { api, ready } = useApp();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!ready || !api || !techniqueId) return;

    let active = true;
    setError(null);

    api
      .listNotes(techniqueId)
      .then((result) => {
        if (active) setNotes(result);
      })
      .catch((caught: unknown) => {
        if (active) setError(toApiError(caught));
      });

    return () => {
      active = false;
    };
  }, [api, ready, techniqueId, version]);

  const refresh = useCallback(() => setVersion((value) => value + 1), []);

  const add = useCallback(
    async (input: Omit<CreateNoteRequest, 'techniqueId'>) => {
      if (!api || !techniqueId) return;

      const created = await api.createNote({ ...input, techniqueId });
      refresh();
      // And into the shared notebook, so Today and the Notes tab - both
      // mounted, neither about to refetch - show it too. The response carries
      // its own context, so there is nothing for a caller to forget.
      applyNote(created);
    },
    [api, techniqueId, refresh, applyNote],
  );

  const edit = useCallback(
    async (noteId: string, body: string) => {
      if (!api) return;

      const updated = await api.updateNote(noteId, body);
      refresh();
      applyNote(updated);
    },
    [api, refresh, applyNote],
  );

  const remove = useCallback(
    async (noteId: string) => {
      if (!api) return;

      await api.deleteNote(noteId);
      refresh();
      removeNote(noteId);
    },
    [api, refresh, removeNote],
  );

  return {
    notes: notes ?? [],
    error,
    loading: notes === null && error === null,
    add,
    edit,
    remove,
  };
}

interface NotebookState {
  notes: NoteWithContext[];
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Every note the learner has written, newest first.
 *
 * A reader over the shared cache. Today and the Notes tab both ask for this
 * and both stay mounted, so a note written on a technique has to appear on
 * both without either being remounted.
 */
export function useNotebook(): NotebookState {
  const { notes, error, ensureNotes, refresh } = useNotebookCache();

  useEffect(() => {
    ensureNotes();
  }, [ensureNotes]);

  return {
    notes: notes ?? [],
    error,
    loading: notes === null && error === null,
    reload: refresh,
  };
}
