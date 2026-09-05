import { ApiError } from '@reps/client';
import type { PracticeEntry } from '@reps/core';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useApp } from '../../providers/app-provider';
import { useOnIdentityChange } from '../../providers/useIdentityChange';

function toApiError(caught: unknown): ApiError {
  return caught instanceof ApiError
    ? caught
    : new ApiError('UnexpectedResponse', (caught as Error).message);
}

interface PracticeHistoryValue {
  entries: PracticeEntry[] | null;
  error: ApiError | null;
  /** Fetches once. Cheap to call from every screen that reads history. */
  ensureHistory: () => void;
  refresh: () => void;
  /** Records a session that just happened, without waiting for a refetch. */
  applyEntry: (entry: PracticeEntry) => void;
}

/** Exported so tests can supply the context without the fetching provider. */
export const PracticeHistoryContext = createContext<PracticeHistoryValue | null>(null);
export type { PracticeHistoryValue };

/**
 * One copy of the practice history, shared by every screen.
 *
 * **Why this exists.** It was fetched per hook instance, once on mount, with
 * no way to invalidate it. Today is a tab, so it stays mounted - which meant
 * finishing a drill updated the board and the XP but left the week chart and
 * the heatmap showing the state from before, until the app was restarted. The
 * same shape of bug as the path cache, and the same fix.
 *
 * `applyEntry` rather than a refetch, for the same reason `applyPath` exists:
 * the reflect response already says what was credited, so the charts can be
 * correct immediately instead of after a round trip the learner would watch.
 */
export function PracticeHistoryProvider({ children }: { children: ReactNode }) {
  const { api, ready } = useApp();
  const [entries, setEntries] = useState<PracticeEntry[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const inFlight = useRef(false);

  const fetchHistory = useCallback(
    (force: boolean) => {
      if (!ready || !api) return;
      if (inFlight.current) return;
      /*
        A failure is terminal until an explicit retry. `ensureHistory` runs
        from an effect keyed on this callback, so a request that failed and
        cleared its own error would retry immediately and loop - which is
        worst on the offline device that produced the failure.
      */
      if (!force && (entries !== null || error !== null)) return;

      inFlight.current = true;
      setError(null);

      api
        .practiceHistory()
        .then((result) => setEntries(result))
        .catch((caught: unknown) => setError(toApiError(caught)))
        .finally(() => {
          inFlight.current = false;
        });
    },
    [api, ready, entries, error],
  );

  // Someone else's practice, once the identity changes. See the path cache.
  useOnIdentityChange(
    useCallback(() => {
      setEntries(null);
      setError(null);
    }, []),
  );

  const applyEntry = useCallback((entry: PracticeEntry) => {
    // Newest first, which is the order the API returns and what the streak
    // and heatmap derivations expect.
    setEntries((current) => (current === null ? current : [entry, ...current]));
  }, []);

  const value = useMemo<PracticeHistoryValue>(
    () => ({
      entries,
      error,
      ensureHistory: () => fetchHistory(false),
      refresh: () => fetchHistory(true),
      applyEntry,
    }),
    [entries, error, fetchHistory, applyEntry],
  );

  return (
    <PracticeHistoryContext.Provider value={value}>{children}</PracticeHistoryContext.Provider>
  );
}

export function usePracticeHistoryCache(): PracticeHistoryValue {
  const value = useContext(PracticeHistoryContext);
  if (!value)
    throw new Error('usePracticeHistoryCache must be used inside PracticeHistoryProvider');

  return value;
}
