import type { LearningPath, LearningPathSummary, Technique } from '@reps/core';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { PathCacheProvider, usePathCache } from '../src/features/paths/path-cache';
import { usePath, usePathList } from '../src/features/paths/usePaths';

const mockListPaths = jest.fn<Promise<LearningPathSummary[]>, []>();
const mockGetPath = jest.fn<Promise<LearningPath>, [string]>();

jest.mock('../src/providers/app-provider', () => ({
  useApp: () => ({
    api: { listPaths: mockListPaths, getPath: mockGetPath },
    ready: true,
    focusedPathId: null,
  }),
}));

function technique(index: number, status: Technique['status']): Technique {
  return {
    id: `tec_${index}`,
    pathId: 'path_guitar',
    order: index,
    title: `Technique ${index}`,
    whyItMatters: 'because',
    modality: 'watch_and_do',
    practicePrompt: 'G -> C -> G -> D, 10 clean reps',
    estimatedMinutes: 20,
    status,
    confidence: status === 'completed' ? 'solid' : null,
    struggleCount: 0,
    practiceMinutes: status === 'completed' ? 20 : 0,
    bridgeForTechniqueId: null,
    searchQueries: [],
    resources: [],
  };
}

function path(statuses: Technique['status'][]): LearningPath {
  return {
    id: 'path_guitar',
    userId: 'usr_1',
    skill: 'guitar',
    archetype: 'motor',
    goal: 'play 5 songs at a campfire',
    level: 'a few chords',
    dailyMinutes: 20,
    daysPerWeek: 5,
    preferredFormats: ['video'],
    language: 'en',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    xp: 0,
    badges: [],
    techniques: statuses.map((status, index) => technique(index, status)),
  };
}

function summaryOf(source: LearningPath): LearningPathSummary {
  const { techniques, ...rest } = source;

  return {
    ...rest,
    techniqueCount: techniques.length,
    completedCount: techniques.filter((item) => item.status === 'completed').length,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <PathCacheProvider>{children}</PathCacheProvider>;
}

const START: Technique['status'][] = ['completed', 'active', 'locked'];
const AFTER_A_COMPLETION: Technique['status'][] = ['completed', 'completed', 'active'];

function doneCount(source: LearningPath | null): number {
  return (source?.techniques ?? []).filter((item) => item.status === 'completed').length;
}

/**
 * The cache is what makes a completion visible on a screen that did not perform
 * it, so these tests are about the bug that motivated it: the board kept
 * rendering pre-completion state until the app was restarted.
 */
describe('path cache', () => {
  beforeEach(() => {
    mockListPaths.mockReset();
    mockGetPath.mockReset();
    mockListPaths.mockResolvedValue([summaryOf(path(START))]);
    mockGetPath.mockResolvedValue(path(START));
  });

  describe('memoising', () => {
    it('fetches a path once however many screens ask for it', async () => {
      // Two consumers mounting in the same commit both see an empty cache, so
      // the in-flight check has to be synchronous.
      const view = await renderHook(
        () => {
          usePath('path_guitar');

          return usePath('path_guitar');
        },
        { wrapper },
      );

      await waitFor(() => expect(view.result.current.path).not.toBeNull());
      expect(mockGetPath).toHaveBeenCalledTimes(1);
    });

    it('serves a path already held without a second request or a skeleton', async () => {
      const view = await renderHook(({ id }: { id: string | null }) => usePath(id), {
        wrapper,
        initialProps: { id: 'path_guitar' as string | null },
      });

      await waitFor(() => expect(view.result.current.path).not.toBeNull());

      // Swiping to another skill and back.
      await view.rerender({ id: null });
      await view.rerender({ id: 'path_guitar' });

      expect(mockGetPath).toHaveBeenCalledTimes(1);
      expect(view.result.current.loading).toBe(false);
      expect(view.result.current.path).not.toBeNull();
    });

    it('refetches when asked to, because reload is an explicit request', async () => {
      const view = await renderHook(() => usePath('path_guitar'), { wrapper });

      await waitFor(() => expect(view.result.current.path).not.toBeNull());
      mockGetPath.mockResolvedValue(path(AFTER_A_COMPLETION));
      await act(async () => view.result.current.reload());

      expect(mockGetPath).toHaveBeenCalledTimes(2);
      await waitFor(() => expect(doneCount(view.result.current.path)).toBe(2));
    });
  });

  describe('after a completion elsewhere in the app', () => {
    it('shows the new progress without anything refetching', async () => {
      const view = await renderHook(
        () => ({ read: usePath('path_guitar'), cache: usePathCache() }),
        { wrapper },
      );

      await waitFor(() => expect(view.result.current.read.path).not.toBeNull());
      expect(doneCount(view.result.current.read.path)).toBe(1);

      // What the practice screen does with the reflect response.
      await act(async () => view.result.current.cache.applyPath(path(AFTER_A_COMPLETION)));

      expect(doneCount(view.result.current.read.path)).toBe(2);
      expect(mockGetPath).toHaveBeenCalledTimes(1);
    });

    it('patches the summary too, so the list and the board agree', async () => {
      const view = await renderHook(() => ({ list: usePathList(), cache: usePathCache() }), {
        wrapper,
      });

      await waitFor(() => expect(view.result.current.list.paths).toHaveLength(1));
      expect(view.result.current.list.paths[0]?.completedCount).toBe(1);

      await act(async () => view.result.current.cache.applyPath(path(AFTER_A_COMPLETION)));

      expect(view.result.current.list.paths[0]?.completedCount).toBe(2);
      expect(mockListPaths).toHaveBeenCalledTimes(1);
    });

    it('leaves an unfetched list alone rather than inventing a one-path list', async () => {
      const view = await renderHook(() => usePathCache(), { wrapper });

      await act(async () => view.result.current.applyPath(path(['active'])));

      // Nothing has asked for the list yet. A single patched-in entry would
      // later read as "this is all the paths there are".
      expect(view.result.current.summaries).toBeNull();
    });
  });

  describe('remembering what the board has already shown', () => {
    it('reports nothing seen on a first view, so there is no animation to play', async () => {
      const view = await renderHook(() => usePathCache(), { wrapper });

      expect(view.result.current.seenDone('path_guitar')).toBeNull();
    });

    it('keeps what was shown across a screen unmounting, so an unlock plays once', async () => {
      const view = await renderHook(() => usePathCache(), { wrapper });

      await act(async () => view.result.current.markSeen('path_guitar', 1));
      expect(view.result.current.seenDone('path_guitar')).toBe(1);

      // The board unmounts when the learner leaves the tab. The figure it
      // animated to has to outlive it, or the next arrival either animates
      // from full - nothing to see - or replays an unlock already watched.
      const reader = view.result.current.seenDone;
      view.unmount();

      expect(reader('path_guitar')).toBe(1);
    });

    it('tracks each path separately', async () => {
      const view = await renderHook(() => usePathCache(), { wrapper });

      await act(async () => {
        view.result.current.markSeen('path_guitar', 2);
        view.result.current.markSeen('path_chess', 5);
      });

      expect(view.result.current.seenDone('path_guitar')).toBe(2);
      expect(view.result.current.seenDone('path_chess')).toBe(5);
      expect(view.result.current.seenDone('path_poker')).toBeNull();
    });
  });

  describe('when a request fails', () => {
    it('reports the failure rather than showing a skeleton for ever', async () => {
      mockGetPath.mockRejectedValue(new Error('offline'));
      const view = await renderHook(() => usePath('path_guitar'), { wrapper });

      await waitFor(() => expect(view.result.current.error).not.toBeNull());
      expect(view.result.current.loading).toBe(false);
    });

    it('clears the failure when the retry is made', async () => {
      mockGetPath.mockRejectedValueOnce(new Error('offline'));
      const view = await renderHook(() => usePath('path_guitar'), { wrapper });

      await waitFor(() => expect(view.result.current.error).not.toBeNull());
      await act(async () => view.result.current.reload());

      await waitFor(() => expect(view.result.current.path).not.toBeNull());
      expect(view.result.current.error).toBeNull();
    });
  });
});
