import { ApiError } from '@reps/client';
import {
  streakFrom,
  today,
  weekEndingToday,
  type PracticeEntry,
  type StreakState,
  type WeekDay,
} from '@reps/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../../providers/app-provider';

interface HistoryState {
  entries: PracticeEntry[];
  streak: StreakState;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
}

const EMPTY_STREAK: StreakState = {
  current: 0,
  longest: 0,
  practisedToday: false,
  totalMinutes: 0,
};

/**
 * Practice history, and the streak derived from it.
 *
 * The derivation happens here rather than on the server because it depends on
 * this device's calendar - see packages/core/src/streak.ts. `today()` is read
 * during the memo, so an app left open past midnight shows the new day on its
 * next render rather than holding yesterday's answer forever.
 */
export function usePracticeHistory(): HistoryState {
  const { api, ready } = useApp();
  const [entries, setEntries] = useState<PracticeEntry[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ready || !api) return;

    let active = true;
    setError(null);

    api
      .practiceHistory()
      .then((result) => {
        if (active) setEntries(result);
      })
      .catch((caught: unknown) => {
        if (!active) return;

        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError('UnexpectedResponse', (caught as Error).message),
        );
      });

    return () => {
      active = false;
    };
  }, [api, ready, attempt]);

  const streak = useMemo(
    () => (entries ? streakFrom(entries, today()) : EMPTY_STREAK),
    [entries],
  );

  return {
    entries: entries ?? [],
    streak,
    error,
    loading: entries === null && error === null,
    reload: useCallback(() => setAttempt((value) => value + 1), []),
  };
}

/** The seven days ending today, for the week strip. */
export function useWeek(
  entries: PracticeEntry[],
  dailyMinutes: number,
  daysPerWeek: number,
): WeekDay[] {
  // The target is passed as two numbers rather than an object so this memo is
  // not invalidated by a fresh object literal on every parent render.
  return useMemo(
    () => weekEndingToday(entries, today(), { dailyMinutes, daysPerWeek }),
    [entries, dailyMinutes, daysPerWeek],
  );
}
