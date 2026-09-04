import { ApiError } from '@reps/client';
import type { CreateNoteRequest, Note, NoteWithContext } from '@reps/core';
import { useCallback, useEffect, useState } from 'react';
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

      await api.createNote({ ...input, techniqueId });
      refresh();
    },
    [api, techniqueId, refresh],
  );

  const edit = useCallback(
    async (noteId: string, body: string) => {
      if (!api) return;

      await api.updateNote(noteId, body);
      refresh();
    },
    [api, refresh],
  );

  const remove = useCallback(
    async (noteId: string) => {
      if (!api) return;

      await api.deleteNote(noteId);
      refresh();
    },
    [api, refresh],
  );

  return { notes: notes ?? [], error, loading: notes === null && error === null, add, edit, remove };
}

interface NotebookState {
  notes: NoteWithContext[];
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
}

/** Every note the learner has written, newest first. */
export function useNotebook(): NotebookState {
  const { api, ready } = useApp();
  const [notes, setNotes] = useState<NoteWithContext[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ready || !api) return;

    let active = true;
    setError(null);

    api
      .listAllNotes()
      .then((result) => {
        if (active) setNotes(result);
      })
      .catch((caught: unknown) => {
        if (active) setError(toApiError(caught));
      });

    return () => {
      active = false;
    };
  }, [api, ready, attempt]);

  return {
    notes: notes ?? [],
    error,
    loading: notes === null && error === null,
    reload: useCallback(() => setAttempt((value) => value + 1), []),
  };
}
