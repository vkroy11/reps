import { ApiError } from '@reps/client';
import type { Note, NoteWithContext } from '@reps/core';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useApp } from '../../providers/app-provider';
import { useOnIdentityChange } from '../../providers/useIdentityChange';

function toApiError(caught: unknown): ApiError {
  return caught instanceof ApiError
    ? caught
    : new ApiError('UnexpectedResponse', (caught as Error).message);
}

/** What a bare Note is missing before the notebook can list it. */
export interface NoteContext {
  techniqueTitle: string;
  pathId: string;
  skill: string;
}

interface NotebookCacheValue {
  notes: NoteWithContext[] | null;
  error: ApiError | null;
  ensureNotes: () => void;
  refresh: () => void;
  /** Folds a note written elsewhere in, without a refetch. */
  applyNote: (note: Note, context: NoteContext) => void;
  removeNote: (noteId: string) => void;
}

/** Exported so tests can supply the context without the fetching provider. */
export const NotebookCacheContext = createContext<NotebookCacheValue | null>(null);
export type { NotebookCacheValue };

/**
 * One copy of the notebook, shared by every screen that reads it.
 *
 * Three screens want this list - Today's "You said", the Notes tab, and the
 * technique screen's own filtered view - and each used to fetch it separately.
 * Tab screens stay mounted, so writing a note updated the screen you wrote it
 * on and left the other two showing the list from before, until the process
 * restarted. Paths, practice history and techniques all had the same bug and
 * all got the same fix; notes were the one that never did.
 *
 * Opening the app with Today and Notes both mounted also fired two identical
 * `listAllNotes` requests. The in-flight ref makes it one.
 */
export function NotebookCacheProvider({ children }: { children: ReactNode }) {
  const { api, ready } = useApp();
  const [notes, setNotes] = useState<NoteWithContext[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const inFlight = useRef(false);

  const fetchNotes = useCallback(
    (force: boolean) => {
      if (!ready || !api) return;
      if (inFlight.current) return;
      // A failure is terminal until an explicit retry - see the path cache.
      if (!force && (notes !== null || error !== null)) return;

      inFlight.current = true;
      setError(null);

      api
        .listAllNotes()
        .then((result) => setNotes(result))
        .catch((caught: unknown) => setError(toApiError(caught)))
        .finally(() => {
          inFlight.current = false;
        });
    },
    [api, ready, notes, error],
  );

  /*
    The write endpoints answer with a bare Note; the notebook needs the
    technique it belongs to as well. The caller has that on screen already, so
    it supplies it rather than the cache refetching to learn something it was
    just told.
  */
  const applyNote = useCallback((note: Note, context: NoteContext) => {
    setNotes((current) => {
      if (current === null) return current;

      const merged: NoteWithContext = { ...note, ...context };
      const existing = current.findIndex((item) => item.id === note.id);
      if (existing === -1) return [merged, ...current];

      return current.map((item) => (item.id === note.id ? { ...item, ...note } : item));
    });
  }, []);

  const removeNote = useCallback((noteId: string) => {
    setNotes((current) => (current === null ? current : current.filter((n) => n.id !== noteId)));
  }, []);

  // Someone else's notes, once the identity changes. See the path cache.
  useOnIdentityChange(
    useCallback(() => {
      setNotes(null);
      setError(null);
    }, []),
  );

  const value = useMemo<NotebookCacheValue>(
    () => ({
      notes,
      error,
      ensureNotes: () => fetchNotes(false),
      refresh: () => fetchNotes(true),
      applyNote,
      removeNote,
    }),
    [notes, error, fetchNotes, applyNote, removeNote],
  );

  return <NotebookCacheContext.Provider value={value}>{children}</NotebookCacheContext.Provider>;
}

export function useNotebookCache(): NotebookCacheValue {
  const value = useContext(NotebookCacheContext);
  if (!value) throw new Error('useNotebookCache must be used inside NotebookCacheProvider');

  return value;
}
