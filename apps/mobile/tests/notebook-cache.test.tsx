import type { NoteWithContext } from '@reps/core';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { NotebookCacheProvider, useNotebookCache } from '../src/features/notes/notebook-cache';
import { useNotebook } from '../src/features/notes/useNotes';

const mockListAllNotes = jest.fn<Promise<NoteWithContext[]>, []>();
let mockSession: { userId: string } | null = null;

jest.mock('../src/providers/app-provider', () => ({
  useApp: () => ({
    api: { listAllNotes: mockListAllNotes },
    ready: true,
    session: mockSession,
  }),
}));

function note(overrides: Partial<NoteWithContext> & { id: string }): NoteWithContext {
  return {
    userId: 'usr_1',
    techniqueId: 'tec_1',
    techniqueTitle: 'Chord transitions',
    pathId: 'path_guitar',
    skill: 'guitar',
    resourceId: 'res_1',
    timestampSec: 222,
    body: 'Pivot finger trick works',
    createdAt: '2026-09-04T10:00:00.000Z',
    updatedAt: '2026-09-04T10:00:00.000Z',
    ...overrides,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <NotebookCacheProvider>{children}</NotebookCacheProvider>;
}

/**
 * Today's "You said", the Notes tab and the technique screen all read this
 * list, and all three stay mounted. Before the cache, a note written on one
 * left the other two showing the list from before until the app restarted.
 */
describe('notebook cache', () => {
  beforeEach(() => {
    mockListAllNotes.mockReset();
    mockListAllNotes.mockResolvedValue([note({ id: 'n1' }), note({ id: 'n2' })]);
    mockSession = null;
  });

  it('fetches once however many screens ask for it', async () => {
    const view = await renderHook(
      () => {
        useNotebook();

        return useNotebook();
      },
      { wrapper },
    );

    await waitFor(() => expect(view.result.current.notes).toHaveLength(2));
    // Today and the Notes tab mounting together used to fire two identical
    // requests.
    expect(mockListAllNotes).toHaveBeenCalledTimes(1);
  });

  describe('after a note is written elsewhere', () => {
    it('appears without a refetch', async () => {
      const view = await renderHook(() => ({ read: useNotebook(), cache: useNotebookCache() }), {
        wrapper,
      });

      await waitFor(() => expect(view.result.current.read.notes).toHaveLength(2));

      const created = note({ id: 'n3', body: 'New thought' });
      await act(async () => view.result.current.cache.applyNote(created));

      expect(view.result.current.read.notes).toHaveLength(3);
      expect(view.result.current.read.notes[0]?.body).toBe('New thought');
      expect(mockListAllNotes).toHaveBeenCalledTimes(1);
    });

    it('edits in place rather than adding a second copy', async () => {
      const view = await renderHook(() => ({ read: useNotebook(), cache: useNotebookCache() }), {
        wrapper,
      });

      await waitFor(() => expect(view.result.current.read.notes).toHaveLength(2));

      await act(async () =>
        view.result.current.cache.applyNote(note({ id: 'n1', body: 'Revised' })),
      );

      expect(view.result.current.read.notes).toHaveLength(2);
      expect(view.result.current.read.notes.find((n) => n.id === 'n1')?.body).toBe('Revised');
    });

    it('drops a deleted note', async () => {
      const view = await renderHook(() => ({ read: useNotebook(), cache: useNotebookCache() }), {
        wrapper,
      });

      await waitFor(() => expect(view.result.current.read.notes).toHaveLength(2));
      await act(async () => view.result.current.cache.removeNote('n1'));

      expect(view.result.current.read.notes.map((n) => n.id)).toEqual(['n2']);
    });
  });

  /** Notes belong to a learner, not a device. */
  describe('when the learner signs in', () => {
    it("drops the previous learner's notes and re-reads, once", async () => {
      const view = await renderHook(() => useNotebook(), { wrapper });

      await waitFor(() => expect(view.result.current.notes).toHaveLength(2));

      mockListAllNotes.mockResolvedValue([note({ id: 'other', skill: 'chess' })]);
      mockSession = { userId: 'usr_signed_in' };
      await act(async () => view.rerender({}));

      await waitFor(() => expect(view.result.current.notes).toHaveLength(1));
      expect(view.result.current.notes[0]?.skill).toBe('chess');
      expect(mockListAllNotes).toHaveBeenCalledTimes(2);
    });
  });

  describe('when the request fails', () => {
    it('reports it rather than loading for ever, and does not loop', async () => {
      mockListAllNotes.mockRejectedValue(new Error('offline'));
      const view = await renderHook(() => useNotebook(), { wrapper });

      await waitFor(() => expect(view.result.current.error).not.toBeNull());
      expect(view.result.current.loading).toBe(false);

      await act(async () => view.rerender({}));
      await act(async () => view.rerender({}));
      expect(mockListAllNotes).toHaveBeenCalledTimes(1);
    });
  });
});
