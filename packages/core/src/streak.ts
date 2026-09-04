import { z } from 'zod';
import { ConfidenceSchema } from './domain';

/**
 * Streaks and practice history.
 *
 * **Why this is computed on the device rather than the server.** Sessions are
 * stored with UTC timestamps, but "did I practise today" is a question about
 * the learner's own calendar. Bucketing in UTC would tell someone in UTC+5:30
 * who practised at 11pm that they practised tomorrow, and would break their
 * streak at midnight UTC - half past five in the afternoon, local.
 *
 * Passing a timezone offset to the server was the alternative, and it is worse:
 * the offset changes with daylight saving, so a stored offset goes stale and a
 * per-request one has to be threaded through every caller. So the API returns
 * timestamps and this file buckets them against the device's clock, which is
 * the only clock that knows what "today" means to the person holding it.
 */

/** One reflection, as the history endpoint returns it. */
export const PracticeEntrySchema = z.object({
  at: z.string(),
  minutes: z.number().int().nonnegative(),
  xp: z.number().int().nonnegative(),
  pathId: z.string(),
  techniqueId: z.string(),
  /**
   * How it went, as the learner reported it.
   *
   * Carried so a day can be described rather than only measured. "Solid" is
   * also what completes a technique, which is what lets the heatmap tell a
   * day that cleared a level apart from a day that put minutes in.
   */
  confidence: ConfidenceSchema,
});
export type PracticeEntry = z.infer<typeof PracticeEntrySchema>;

/** A calendar day in the device's own timezone, as YYYY-MM-DD. */
export type LocalDay = string;

/** Formats a Date as its own local calendar day. Never touches UTC. */
export function toLocalDay(date: Date): LocalDay {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/** Parses a local day back to noon on that day - see shiftDay for why noon. */
export function fromLocalDay(day: LocalDay): Date {
  const [year, month, date] = day.split('-').map(Number);

  return new Date(year ?? 1970, (month ?? 1) - 1, date ?? 1, 12);
}

export function today(now: Date = new Date()): LocalDay {
  return toLocalDay(now);
}

/**
 * Shifts a local day by whole days.
 *
 * Anchored at noon, not midnight: on a spring-forward date midnight may not
 * exist locally, and `setDate` from midnight can land on the previous day.
 * Noon is never within an hour of any transition.
 */
export function shiftDay(day: LocalDay, delta: number): LocalDay {
  const shifted = fromLocalDay(day);
  shifted.setDate(shifted.getDate() + delta);

  return toLocalDay(shifted);
}

/** The distinct local days that have at least one session, most recent first. */
export function practisedDays(entries: PracticeEntry[]): LocalDay[] {
  const days = new Set<LocalDay>();

  for (const entry of entries) {
    const date = new Date(entry.at);
    if (Number.isNaN(date.getTime())) continue;

    days.add(toLocalDay(date));
  }

  // Lexical sort is chronological for YYYY-MM-DD.
  return [...days].sort().reverse();
}

export interface StreakState {
  /** Consecutive days up to and including today, or yesterday if today is idle. */
  current: number;
  /** The best run in the supplied history. */
  longest: number;
  /** Whether today already counts, so the UI can say "keep it" versus "start it". */
  practisedToday: boolean;
  /** Total minutes across the supplied history. */
  totalMinutes: number;
}

/**
 * The streak as of `today`.
 *
 * A day missed today does not break the streak until tomorrow: at 9am, "3 days"
 * should still read 3, not 0, or the number would collapse every midnight and
 * punish the learner for not having practised yet. It breaks once *yesterday*
 * is also empty.
 */
export function streakFrom(entries: PracticeEntry[], asOf: LocalDay): StreakState {
  const days = new Set(practisedDays(entries));
  const totalMinutes = entries.reduce((sum, entry) => sum + entry.minutes, 0);
  const practisedToday = days.has(asOf);

  let current = 0;
  let cursor = practisedToday ? asOf : shiftDay(asOf, -1);
  while (days.has(cursor)) {
    current += 1;
    cursor = shiftDay(cursor, -1);
  }

  return { current, longest: longestRun(days), practisedToday, totalMinutes };
}

function longestRun(days: Set<LocalDay>): number {
  let longest = 0;

  for (const day of days) {
    // Count a run only from its earliest day, so each is measured once.
    if (days.has(shiftDay(day, -1))) continue;

    let length = 0;
    let cursor = day;
    while (days.has(cursor)) {
      length += 1;
      cursor = shiftDay(cursor, 1);
    }

    longest = Math.max(longest, length);
  }

  return longest;
}

export type DayStatus = 'done' | 'partial' | 'missed' | 'rest' | 'future';

export interface WeekDay {
  day: LocalDay;
  /** Monday-first index, 0-6. */
  weekday: number;
  dayOfMonth: number;
  minutes: number;
  status: DayStatus;
  isToday: boolean;
}

/**
 * The seven days ending today, for the week strip.
 *
 * `partial` means practised but under the daily target. `rest` is a day the
 * learner never committed to: a five-day-a-week plan must not show two red
 * misses every weekend. The app has no idea *which* weekdays someone intends
 * to rest on - it was never asked - so the allowance is spent on the oldest
 * empty days in the window, which leaves a recent gap reading honestly as a
 * miss rather than being excused.
 */
export function weekEndingToday(
  entries: PracticeEntry[],
  asOf: LocalDay,
  target: { dailyMinutes: number; daysPerWeek: number },
): WeekDay[] {
  const minutesByDay = new Map<LocalDay, number>();

  for (const entry of entries) {
    const date = new Date(entry.at);
    if (Number.isNaN(date.getTime())) continue;

    const day = toLocalDay(date);
    minutesByDay.set(day, (minutesByDay.get(day) ?? 0) + entry.minutes);
  }

  const week: WeekDay[] = [];
  let restBudget = Math.max(7 - target.daysPerWeek, 0);

  for (let back = 6; back >= 0; back -= 1) {
    const day = shiftDay(asOf, -back);
    const minutes = minutesByDay.get(day) ?? 0;
    const date = fromLocalDay(day);
    // JavaScript weeks start on Sunday; the strip starts on Monday.
    const weekday = (date.getDay() + 6) % 7;

    let status: DayStatus;
    if (minutes >= target.dailyMinutes && minutes > 0) status = 'done';
    else if (minutes > 0) status = 'partial';
    else if (restBudget > 0) {
      status = 'rest';
      restBudget -= 1;
    } else status = 'missed';

    week.push({
      day,
      weekday,
      dayOfMonth: date.getDate(),
      minutes,
      status,
      isToday: day === asOf,
    });
  }

  return week;
}
