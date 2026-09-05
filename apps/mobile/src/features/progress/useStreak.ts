import { ApiError } from '@reps/client';
import {
  streakFrom,
  today,
  weekEndingToday,
  type PracticeEntry,
  type StreakState,
  type WeekDay,
} from '@reps/core';
import { useEffect, useMemo } from 'react';
import { usePracticeHistoryCache } from './practice-history';

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
 * A reader over the shared cache rather than its own fetch: Today and the
 * profile both ask for this, and a session finished on the practice screen has
 * to be visible on both without a reload.
 *
 * The derivation happens here rather than on the server because it depends on
 * this device's calendar - see packages/core/src/streak.ts. `today()` is read
 * during the memo, so an app left open past midnight shows the new day on its
 * next render rather than holding yesterday's answer forever.
 */
export function usePracticeHistory(): HistoryState {
  const { entries, error, ensureHistory, refresh } = usePracticeHistoryCache();

  useEffect(() => {
    ensureHistory();
  }, [ensureHistory]);

  const streak = useMemo(() => (entries ? streakFrom(entries, today()) : EMPTY_STREAK), [entries]);

  return {
    entries: entries ?? [],
    streak,
    error,
    loading: entries === null && error === null,
    reload: refresh,
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
