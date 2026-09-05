import type { Confidence, PracticeEntry } from '@reps/core';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import {
  PracticeHistoryProvider,
  usePracticeHistoryCache,
} from '../src/features/progress/practice-history';
import { usePracticeHistory, useWeek } from '../src/features/progress/useStreak';

const mockPracticeHistory = jest.fn<Promise<PracticeEntry[]>, []>();

let mockSession: { userId: string } | null = null;

jest.mock('../src/providers/app-provider', () => ({
  useApp: () => ({
    api: { practiceHistory: mockPracticeHistory },
    ready: true,
    session: mockSession,
  }),
}));

function entryDaysAgo(back: number, minutes = 20, confidence: Confidence = 'solid'): PracticeEntry {
  const at = new Date();
  at.setDate(at.getDate() - back);
  at.setHours(12, 0, 0, 0);

  return {
    at: at.toISOString(),
    minutes,
    xp: minutes * 2,
    pathId: 'path_1',
    techniqueId: 'tec_1',
    confidence,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <PracticeHistoryProvider>{children}</PracticeHistoryProvider>;
}

/**
 * The bug this exists for: Today is a tab, so it stays mounted. History was
 * fetched once per hook instance with no way to invalidate it, which meant
 * finishing a drill moved the board and the XP but left the week chart and the
 * heatmap showing the state from before, until the app was restarted.
 */
describe('practice history', () => {
  beforeEach(() => {
    mockPracticeHistory.mockReset();
    mockPracticeHistory.mockResolvedValue([entryDaysAgo(1), entryDaysAgo(3)]);
    mockSession = null;
  });

  /**
   * Signing in makes this device speak for a different learner, whose practice
   * may have happened on another device entirely. Held data belongs to
   * somebody else, so it is dropped and re-read - exactly once, not once per
   * effect that happens to re-run as the cache settles.
   */
  describe('when the learner signs in', () => {
    it("drops the previous learner's history and re-reads, once", async () => {
      const view = await renderHook(() => usePracticeHistory(), { wrapper });

      await waitFor(() => expect(view.result.current.entries).toHaveLength(2));

      mockPracticeHistory.mockResolvedValue([entryDaysAgo(0), entryDaysAgo(2), entryDaysAgo(4)]);
      mockSession = { userId: 'usr_signed_in' };
      await act(async () => view.rerender({}));

      await waitFor(() => expect(view.result.current.entries).toHaveLength(3));
      expect(mockPracticeHistory).toHaveBeenCalledTimes(2);
    });

    it('re-reads again on sign-out, because the device is anonymous now', async () => {
      mockSession = { userId: 'usr_signed_in' };
      const view = await renderHook(() => usePracticeHistory(), { wrapper });

      await waitFor(() => expect(view.result.current.entries).toHaveLength(2));

      mockPracticeHistory.mockResolvedValue([]);
      mockSession = null;
      await act(async () => view.rerender({}));

      await waitFor(() => expect(view.result.current.entries).toHaveLength(0));
      expect(mockPracticeHistory).toHaveBeenCalledTimes(2);
    });
  });

  it('fetches once however many screens ask for it', async () => {
    const view = await renderHook(
      () => {
        usePracticeHistory();

        return usePracticeHistory();
      },
      { wrapper },
    );

    await waitFor(() => expect(view.result.current.entries).toHaveLength(2));
    expect(mockPracticeHistory).toHaveBeenCalledTimes(1);
  });

  describe('after a session is finished elsewhere in the app', () => {
    it('shows it without refetching', async () => {
      const view = await renderHook(
        () => ({ read: usePracticeHistory(), cache: usePracticeHistoryCache() }),
        { wrapper },
      );

      await waitFor(() => expect(view.result.current.read.entries).toHaveLength(2));

      // What the practice screen does with the reflect response.
      await act(async () => view.result.current.cache.applyEntry(entryDaysAgo(0, 25)));

      expect(view.result.current.read.entries).toHaveLength(3);
      expect(mockPracticeHistory).toHaveBeenCalledTimes(1);
    });

    /** The week chart is the panel that visibly failed to move. */
    it('moves the week chart the same render', async () => {
      const view = await renderHook(
        () => {
          const { entries } = usePracticeHistory();

          return { week: useWeek(entries, 20, 5), cache: usePracticeHistoryCache() };
        },
        { wrapper },
      );

      await waitFor(() => expect(view.result.current.week).toHaveLength(7));
      const before = view.result.current.week.at(-1);
      expect(before?.minutes).toBe(0);

      await act(async () => view.result.current.cache.applyEntry(entryDaysAgo(0, 25)));

      const after = view.result.current.week.at(-1);
      expect(after?.isToday).toBe(true);
      expect(after?.minutes).toBe(25);
    });

    it('counts towards the streak immediately', async () => {
      const view = await renderHook(
        () => ({ read: usePracticeHistory(), cache: usePracticeHistoryCache() }),
        { wrapper },
      );

      await waitFor(() => expect(view.result.current.read.entries).toHaveLength(2));
      expect(view.result.current.read.streak.practisedToday).toBe(false);

      await act(async () => view.result.current.cache.applyEntry(entryDaysAgo(0)));

      expect(view.result.current.read.streak.practisedToday).toBe(true);
    });

    /** Newest first, which is the order the API returns. */
    it('keeps the order the derivations expect', async () => {
      // The reader is what triggers the fetch - the cache alone never asks.
      const view = await renderHook(
        () => ({ read: usePracticeHistory(), cache: usePracticeHistoryCache() }),
        { wrapper },
      );

      await waitFor(() => expect(view.result.current.read.entries).toHaveLength(2));
      const fresh = entryDaysAgo(0);
      await act(async () => view.result.current.cache.applyEntry(fresh));

      expect(view.result.current.read.entries[0]).toEqual(fresh);
    });
  });

  describe('when the request fails', () => {
    it('reports it rather than loading for ever', async () => {
      mockPracticeHistory.mockRejectedValue(new Error('offline'));
      const view = await renderHook(() => usePracticeHistory(), { wrapper });

      await waitFor(() => expect(view.result.current.error).not.toBeNull());
      expect(view.result.current.loading).toBe(false);
    });

    /**
     * `ensureHistory` runs from an effect keyed on the callback, which changes
     * whenever the cache does - so a failure that cleared its own error would
     * retry in a tight loop, on exactly the offline device that caused it.
     */
    it('does not retry in a loop', async () => {
      mockPracticeHistory.mockRejectedValue(new Error('offline'));
      const view = await renderHook(() => usePracticeHistory(), { wrapper });

      await waitFor(() => expect(view.result.current.error).not.toBeNull());
      await act(async () => view.rerender({}));
      await act(async () => view.rerender({}));

      expect(mockPracticeHistory).toHaveBeenCalledTimes(1);
    });

    it('retries when asked to', async () => {
      mockPracticeHistory.mockRejectedValueOnce(new Error('offline'));
      const view = await renderHook(() => usePracticeHistory(), { wrapper });

      await waitFor(() => expect(view.result.current.error).not.toBeNull());
      await act(async () => view.result.current.reload());

      await waitFor(() => expect(view.result.current.entries).toHaveLength(2));
      expect(view.result.current.error).toBeNull();
    });
  });
});
